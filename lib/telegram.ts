import * as XLSX from 'xlsx'
import { supabase } from './supabase'

const BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN!
const CHAT_ID = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID!

async function buildBackupWorkbook() {
  const [customers, suppliers, products, inventory, sales, expenses] = await Promise.all([
    supabase.from('customers').select('*').order('created_at'),
    supabase.from('suppliers').select('*').order('created_at'),
    supabase.from('products').select('*, categories(name)').order('created_at'),
    supabase.from('inventory').select('*, products(name)').order('updated_at', { ascending: false }),
    supabase.from('sales').select('*, customers(name)').order('sale_date', { ascending: false }),
    supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
  ])

  const wb = XLSX.utils.book_new()

  const addSheet = (rows: Record<string, unknown>[] | null, name: string) => {
    const ws = XLSX.utils.json_to_sheet(rows ?? [])
    XLSX.utils.book_append_sheet(wb, ws, name)
  }

  addSheet(
    (customers.data ?? []).map(r => ({
      الاسم: r.name,
      الهاتف: r.phone ?? '',
      العنوان: r.address ?? '',
      'الرصيد المستحق $': r.balance_owed,
      'تاريخ الإضافة': r.created_at?.slice(0, 10),
    })),
    'الزبائن'
  )

  addSheet(
    (suppliers.data ?? []).map(r => ({
      الاسم: r.name,
      الهاتف: r.phone ?? '',
      العنوان: r.address ?? '',
      'المستحق عليه $': r.balance_owed,
      العملة: r.currency,
      'تاريخ الإضافة': r.created_at?.slice(0, 10),
    })),
    'الموردون'
  )

  addSheet(
    (products.data ?? []).map((r: Record<string, unknown> & { categories?: { name?: string } | null }) => ({
      الاسم: r.name,
      الفئة: r.categories?.name ?? '',
      الوحدة: r.unit,
      'سعر التكلفة': r.cost_price_usd,
      'سعر البيع': r.sale_price_usd,
    })),
    'المنتجات'
  )

  addSheet(
    (inventory.data ?? []).map((r: Record<string, unknown> & { products?: { name?: string } | null }) => ({
      المنتج: r.products?.name ?? '',
      الكمية: r.quantity,
      'حد التنبيه': r.min_quantity,
      الموقع: r.warehouse_location ?? '',
      'آخر تحديث': (r.updated_at as string)?.slice(0, 10),
    })),
    'المخزون'
  )

  addSheet(
    (sales.data ?? []).map((r: Record<string, unknown> & { customers?: { name?: string } | null }) => ({
      التاريخ: r.sale_date,
      الزبون: r.customers?.name ?? 'نقدي',
      'نوع الدفع': r.payment_type,
      العملة: r.currency,
      'المجموع': r.total_amount,
      'المدفوع': r.amount_paid,
      'المتبقي': (r.total_amount as number) - (r.amount_paid as number),
      الحالة: r.status,
    })),
    'المبيعات'
  )

  addSheet(
    (expenses.data ?? []).map(r => ({
      التاريخ: r.expense_date,
      الفئة: r.category,
      الوصف: r.description,
      المبلغ: r.amount,
      العملة: r.currency,
      ملاحظة: r.note ?? '',
    })),
    'المصاريف'
  )

  return wb
}

export async function sendBackupToTelegram(): Promise<void> {
  const wb = await buildBackupWorkbook()
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Baghdad' })
  const filename = `backup-${new Date().toISOString().slice(0, 10)}.xlsx`

  const form = new FormData()
  form.append('chat_id', CHAT_ID)
  form.append('document', blob, filename)
  form.append('caption', `📦 نسخة احتياطية تلقائية\n🕐 ${now}`)

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.description ?? 'Telegram API error')
  }
}

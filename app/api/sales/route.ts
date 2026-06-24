import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'


export async function GET() {
  const { data, error } = await supabase
    .from('sales')
    .select('*, customers(name, phone), sale_items(*, products(name, unit))')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { items, installments: installmentData, ...saleData } = body

  // Determine initial status
  let status = 'مدفوع'
  if (saleData.payment_type === 'دين') {
    status = 'دين'
    saleData.amount_paid = 0
  } else if (saleData.payment_type === 'أقساط') {
    status = saleData.amount_paid > 0 ? 'جزئي' : 'دين'
  } else if (saleData.amount_paid < saleData.total_amount) {
    status = 'جزئي'
  }

  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({ ...saleData, status })
    .select()
    .single()

  if (saleError) return NextResponse.json({ error: saleError.message }, { status: 400 })

  // Insert sale items & update inventory
  if (items?.length > 0) {
    const saleItems = items.map((item: { product_id: string; quantity: number; unit_price: number }) => ({
      ...item,
      sale_id: sale.id,
    }))
    await supabase.from('sale_items').insert(saleItems)

    for (const item of items) {
      const { data: inv } = await supabase.from('inventory').select('quantity').eq('product_id', item.product_id).single()
      const newQty = Math.max(0, (inv?.quantity ?? 0) - item.quantity)
      await supabase.from('inventory').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('product_id', item.product_id)
      await supabase.from('inventory_transactions').insert({
        product_id: item.product_id,
        type: 'خروج',
        quantity: item.quantity,
        reference_type: 'بيع',
        reference_id: sale.id,
      })
    }
  }

  // Insert installments
  if (installmentData?.length > 0) {
    const insts = installmentData.map((inst: { due_date: string; amount: number }) => ({
      ...inst,
      sale_id: sale.id,
      status: 'معلق',
    }))
    await supabase.from('installments').insert(insts)
  }

  // Update customer balance if credit/installment
  if (saleData.customer_id && status !== 'مدفوع') {
    const remaining = saleData.total_amount - (saleData.amount_paid ?? 0)
    const { data: cust } = await supabase.from('customers').select('balance_owed').eq('id', saleData.customer_id).single()
    await supabase.from('customers').update({ balance_owed: (cust?.balance_owed ?? 0) + remaining }).eq('id', saleData.customer_id)
  }

  return NextResponse.json(sale, { status: 201 })
}

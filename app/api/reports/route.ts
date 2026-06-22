import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') ?? 'dashboard'
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  if (type === 'dashboard') {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    const [todaySales, monthSales, customerDebt, supplierDebt, lowStock] = await Promise.all([
      supabase.from('sales').select('total_amount, currency, exchange_rate').eq('sale_date', today),
      supabase.from('sales').select('total_amount, currency, exchange_rate').gte('sale_date', monthStart),
      supabase.from('customers').select('balance_owed').gt('balance_owed', 0),
      supabase.from('suppliers').select('balance_owed').gt('balance_owed', 0),
      supabase.from('inventory').select('quantity, min_quantity, products(name)').filter('quantity', 'lte', 'min_quantity'),
    ])

    const sumUSD = (rows: { total_amount: number; currency: string; exchange_rate: number }[]) =>
      rows.reduce((s, r) => s + (r.currency === 'USD' ? r.total_amount : r.total_amount / r.exchange_rate), 0)

    return NextResponse.json({
      today_sales_usd: sumUSD(todaySales.data ?? []),
      month_sales_usd: sumUSD(monthSales.data ?? []),
      customer_debt_usd: (customerDebt.data ?? []).reduce((s, r) => s + r.balance_owed, 0),
      supplier_debt_usd: (supplierDebt.data ?? []).reduce((s, r) => s + r.balance_owed, 0),
      low_stock_count: (lowStock.data ?? []).length,
    })
  }

  if (type === 'sales') {
    let query = supabase
      .from('sales')
      .select('*, customers(name), sale_items(quantity, unit_price, total, products(name))')
      .order('sale_date', { ascending: false })
    if (from) query = query.gte('sale_date', from)
    if (to) query = query.lte('sale_date', to)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (type === 'debts') {
    const [customers, suppliers] = await Promise.all([
      supabase.from('customers').select('*').gt('balance_owed', 0).order('balance_owed', { ascending: false }),
      supabase.from('suppliers').select('*').gt('balance_owed', 0).order('balance_owed', { ascending: false }),
    ])
    return NextResponse.json({
      customers: customers.data ?? [],
      suppliers: suppliers.data ?? [],
    })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

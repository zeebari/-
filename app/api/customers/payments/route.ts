import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer_id')
  let query = supabase.from('customer_payments').select('*').order('created_at', { ascending: false })
  if (customerId) query = query.eq('customer_id', customerId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { customer_id, sale_id, amount, currency, exchange_rate, payment_date, note } = body

  const { data: payment, error } = await supabase
    .from('customer_payments')
    .insert({ customer_id, sale_id, amount, currency, exchange_rate: exchange_rate ?? 1, payment_date, note })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update customer balance
  const { data: cust } = await supabase.from('customers').select('balance_owed').eq('id', customer_id).single()
  await supabase.from('customers').update({ balance_owed: Math.max(0, (cust?.balance_owed ?? 0) - amount) }).eq('id', customer_id)

  // Update sale paid amount & status
  if (sale_id) {
    const { data: sale } = await supabase.from('sales').select('total_amount, amount_paid').eq('id', sale_id).single()
    if (sale) {
      const newPaid = sale.amount_paid + amount
      const newStatus = newPaid >= sale.total_amount ? 'مدفوع' : 'جزئي'
      await supabase.from('sales').update({ amount_paid: newPaid, status: newStatus }).eq('id', sale_id)
    }
  }

  return NextResponse.json(payment, { status: 201 })
}

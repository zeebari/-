import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'


export async function GET(req: NextRequest) {
  const supplierId = req.nextUrl.searchParams.get('supplier_id')
  let query = supabase.from('supplier_payments').select('*').order('created_at', { ascending: false })
  if (supplierId) query = query.eq('supplier_id', supplierId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { supplier_id, purchase_order_id, amount, currency, exchange_rate, payment_date, note } = body

  const { data: payment, error } = await supabase
    .from('supplier_payments')
    .insert({ supplier_id, purchase_order_id, amount, currency, exchange_rate, payment_date, note })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update supplier balance
  const { data: sup } = await supabase.from('suppliers').select('balance_owed').eq('id', supplier_id).single()
  await supabase.from('suppliers').update({ balance_owed: Math.max(0, (sup?.balance_owed ?? 0) - amount) }).eq('id', supplier_id)

  // Update purchase order paid amount & status
  if (purchase_order_id) {
    const { data: po } = await supabase.from('purchase_orders').select('total_amount, amount_paid').eq('id', purchase_order_id).single()
    if (po) {
      const newPaid = po.amount_paid + amount
      const newStatus = newPaid >= po.total_amount ? 'مدفوع' : 'جزئي'
      await supabase.from('purchase_orders').update({ amount_paid: newPaid, status: newStatus }).eq('id', purchase_order_id)
    }
  }

  return NextResponse.json(payment, { status: 201 })
}

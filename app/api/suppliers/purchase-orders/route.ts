import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'


export async function GET(req: NextRequest) {
  const supplierId = req.nextUrl.searchParams.get('supplier_id')
  let query = supabase
    .from('purchase_orders')
    .select('*, suppliers(name), purchase_order_items(*, products(name, unit))')
    .order('created_at', { ascending: false })

  if (supplierId) query = query.eq('supplier_id', supplierId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { items, ...orderData } = body

  const { data: order, error: orderError } = await supabase
    .from('purchase_orders')
    .insert(orderData)
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 })

  if (items?.length > 0) {
    const itemsWithOrder = items.map((item: { product_id: string; quantity: number; unit_price: number }) => ({
      ...item,
      purchase_order_id: order.id,
    }))
    const { error: itemsError } = await supabase.from('purchase_order_items').insert(itemsWithOrder)
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 })

    // Update inventory
    for (const item of items) {
      const { data: inv } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', item.product_id)
        .single()

      const newQty = (inv?.quantity ?? 0) + item.quantity
      await supabase.from('inventory').upsert({
        product_id: item.product_id,
        quantity: newQty,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'product_id' })

      await supabase.from('inventory_transactions').insert({
        product_id: item.product_id,
        type: 'دخول',
        quantity: item.quantity,
        reference_type: 'شراء',
        reference_id: order.id,
        note: `فاتورة شراء ${order.id.slice(0, 8)}`,
      })
    }
  }

  // Update supplier balance
  if (orderData.supplier_id) {
    const remaining = orderData.total_amount - (orderData.amount_paid ?? 0)
    const { data: sup } = await supabase.from('suppliers').select('balance_owed').eq('id', orderData.supplier_id).single()
    await supabase.from('suppliers').update({ balance_owed: (sup?.balance_owed ?? 0) + remaining }).eq('id', orderData.supplier_id)
  }

  return NextResponse.json(order, { status: 201 })
}

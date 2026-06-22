import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('inventory')
    .select('*, products(*, categories(name))')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { product_id, quantity, min_quantity, warehouse_location, note } = body

  const { data: current } = await supabase
    .from('inventory')
    .select('quantity')
    .eq('product_id', product_id)
    .single()

  const { data, error } = await supabase
    .from('inventory')
    .update({ quantity, min_quantity, warehouse_location, updated_at: new Date().toISOString() })
    .eq('product_id', product_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const diff = quantity - (current?.quantity ?? 0)
  if (diff !== 0) {
    await supabase.from('inventory_transactions').insert({
      product_id,
      type: 'تعديل',
      quantity: Math.abs(diff),
      reference_type: 'تعديل يدوي',
      note,
    })
  }

  return NextResponse.json(data)
}

import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'


export async function GET() {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .order('rate_date', { ascending: false })
    .limit(1)
    .single()

  if (error) return NextResponse.json({ usd_to_iqd: 1310, rate_date: new Date().toISOString().split('T')[0] })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { usd_to_iqd } = await req.json()
  const { data, error } = await supabase
    .from('exchange_rates')
    .insert({ usd_to_iqd, rate_date: new Date().toISOString().split('T')[0] })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

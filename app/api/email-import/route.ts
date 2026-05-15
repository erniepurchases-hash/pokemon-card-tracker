import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ahqlcahkgzulxroqtday.supabase.co',
  'sb_publishable_7Y_AB0_7kB59hOLrDXcD0g_kZA6F0Mi'
)

const WEBHOOK_SECRET = 'pk-sync-ernest-2026'

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { card_name, purchase_date, purchase_price_per_unit, quantity, seller, platform, payment_method, notes } = body

  if (!card_name?.trim()) {
    return NextResponse.json({ error: 'card_name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cards')
    .insert({
      card_name: card_name.trim(),
      purchase_date: purchase_date || null,
      purchase_price_per_unit: purchase_price_per_unit || null,
      quantity: quantity || 1,
      seller: seller || null,
      platform: platform || null,
      payment_method: payment_method || null,
      status: 'in_stock',
      notes: notes || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, id: data.id })
}

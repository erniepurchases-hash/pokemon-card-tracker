import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ahqlcahkgzulxroqtday.supabase.co',
  'sb_publishable_7Y_AB0_7kB59hOLrDXcD0g_kZA6F0Mi'
)

const WEBHOOK_SECRET = 'pk-sync-ernest-2026'

function parseDate(s: unknown): string | null {
  if (!s) return null
  const m = String(s).trim().match(/^(\d+)\/(\d+)\/(\d+)/)
  if (!m) return null
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

function parseNum(s: unknown): number | null {
  if (!s) return null
  const n = parseFloat(String(s).trim().replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
}

function str(s: unknown): string | null {
  const v = String(s ?? '').trim()
  return v || null
}

export async function GET() {
  return NextResponse.json({ ok: true, message: 'sheets-sync endpoint is live' })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { rowData, dbId } = body
  // rowData columns: [date_purchased, item, set_source, qty, total_cost, payment_method,
  //                   seller, sale_price, sale_date, platform, status, notes]

  if (!Array.isArray(rowData) || rowData.length < 2) {
    return NextResponse.json({ error: 'Invalid row data' }, { status: 400 })
  }

  const [date_purchased, item, set_source, qty_s, total_cost_s, payment_method,
    seller, sale_price_s, sale_date_s, platform, status_s, notes_raw] = rowData

  const card_name = str(item)
  if (!card_name) return NextResponse.json({ error: 'Empty card name' }, { status: 400 })

  const quantity = Math.max(1, parseInt(String(qty_s)) || 1)
  const total_cost = parseNum(total_cost_s)
  const status = String(status_s ?? '').trim().toLowerCase() === 'sold' ? 'sold' : 'in_stock'

  const payload = {
    card_name,
    set_source: str(set_source),
    quantity,
    purchase_date: parseDate(date_purchased),
    purchase_price_per_unit: total_cost != null ? Math.round((total_cost / quantity) * 100) / 100 : null,
    payment_method: str(payment_method),
    seller: str(seller),
    sale_price: parseNum(sale_price_s),
    sale_date: parseDate(sale_date_s),
    platform: str(platform),
    status,
    notes: str(notes_raw),
  }

  let result
  if (dbId) {
    result = await supabase.from('cards').update(payload).eq('id', dbId).select('id').single()
  } else {
    result = await supabase.from('cards').insert(payload).select('id').single()
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: result.data.id })
}

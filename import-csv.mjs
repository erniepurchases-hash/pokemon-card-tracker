import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read .env.local
const env = {}
for (const line of readFileSync(join(__dirname, '.env.local'), 'utf-8').split('\n')) {
  const idx = line.indexOf('=')
  if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// CSV parser that handles quoted fields
function parseCSVLine(line) {
  const fields = []
  let cur = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { fields.push(cur); cur = '' }
    else { cur += ch }
  }
  fields.push(cur)
  return fields
}

function parseDate(s) {
  const m = s?.trim().match(/^(\d+)\/(\d+)\/(\d+)/)
  if (!m) return null
  return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
}

function parseNum(s) {
  if (!s?.trim()) return null
  const n = parseFloat(s.trim().replace(/,/g, ''))
  return isNaN(n) ? null : n
}

function mapStatus(s) {
  const v = s?.trim().toLowerCase()
  if (v === 'sold') return 'sold'
  if (v === 'unsold' || v === 'purchased') return 'in_stock'
  return null
}

const CSV = 'C:\\Users\\ernes\\Downloads\\pokemon_inventory (8).csv'
const lines = readFileSync(CSV, 'utf-8').split('\n')
// columns: date_purchased,item,set_source,qty,total_cost,payment_method,seller,sale_price,sale_date,platform,status,notes

const cards = []
const skipped = []

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim()
  if (!line) continue

  const [date_purchased, item, set_source, qty_s, total_cost_s, payment_method, seller,
         sale_price_s, sale_date_s, platform, status_s, notes_raw] = parseCSVLine(line)

  const card_name = item?.trim()
  if (!card_name) { skipped.push(`row ${i + 1}: empty name (totals row)`); continue }

  const status = mapStatus(status_s)
  if (!status) { skipped.push(`row ${i + 1}: "${card_name}" — no valid status ("${status_s?.trim()}")`); continue }

  const quantity = Math.max(1, parseInt(qty_s) || 1)
  const total_cost = parseNum(total_cost_s)
  const purchase_price_per_unit =
    total_cost != null ? Math.round((total_cost / quantity) * 100) / 100 : null

  cards.push({
    card_name,
    set_source: set_source?.trim() || null,
    quantity,
    purchase_date: parseDate(date_purchased),
    purchase_price_per_unit,
    payment_method: payment_method?.trim() || null,
    seller: seller?.trim() || null,
    sale_price: parseNum(sale_price_s),
    sale_date: parseDate(sale_date_s),
    platform: platform?.trim() || null,
    status,
    notes: notes_raw?.trim() || null,
  })
}

console.log(`\nReady to import: ${cards.length} cards`)
if (skipped.length) {
  console.log(`Skipped ${skipped.length} rows:`)
  skipped.forEach(s => console.log(`  - ${s}`))
}

console.log('\nClearing existing data...')
const { error: delError } = await supabase.from('cards').delete().not('id', 'is', null)
if (delError) { console.error('Delete failed:', delError.message); process.exit(1) }

console.log('Importing...')
const { data, error } = await supabase.from('cards').insert(cards).select('id')
if (error) {
  console.error('\nImport failed:', error.message)
  process.exit(1)
}
console.log(`\nDone! Imported ${data.length} cards into Supabase.`)

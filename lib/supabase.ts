import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ahqlcahkgzulxroqtday.supabase.co',
  'sb_publishable_7Y_AB0_7kB59hOLrDXcD0g_kZA6F0Mi'
)

export type Card = {
  id: string
  card_name: string
  set_source: string | null
  quantity: number
  purchase_date: string | null
  purchase_price_per_unit: number | null
  total_cost: number | null
  payment_method: string | null
  seller: string | null
  sale_date: string | null
  sale_price: number | null
  grading_fee: number | null
  other_costs: number | null
  sold_to: string | null
  platform: string | null
  net_profit: number | null
  status: 'in_stock' | 'sold'
  notes: string | null
  created_at: string
}

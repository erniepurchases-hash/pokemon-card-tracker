import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

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

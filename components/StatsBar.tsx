import { Card } from '@/lib/supabase'

export default function StatsBar({ cards }: { cards: Card[] }) {
  const sold = cards.filter(c => c.status === 'sold')
  const inStock = cards.filter(c => c.status === 'in_stock')

  const stockValue = inStock.reduce((s, c) => s + (c.total_cost ?? 0), 0)
  const revenue = sold.reduce((s, c) => s + (c.sale_price ?? 0), 0)
  const profit = sold.reduce((s, c) => s + (c.net_profit ?? 0), 0)

  const fmt = (n: number) => `$${n.toFixed(2)}`

  const items = [
    {
      label: 'Cards In Stock',
      value: inStock.reduce((s, c) => s + c.quantity, 0).toString(),
      sub: `${inStock.length} ${inStock.length === 1 ? 'entry' : 'entries'}`,
      color: 'text-gray-100',
    },
    {
      label: 'Stock Cost Basis',
      value: fmt(stockValue),
      sub: 'total invested in current stock',
      color: 'text-gray-100',
    },
    {
      label: 'Total Revenue',
      value: fmt(revenue),
      sub: `from ${sold.length} sold ${sold.length === 1 ? 'entry' : 'entries'}`,
      color: 'text-gray-100',
    },
    {
      label: 'Net Profit',
      value: fmt(profit),
      sub: 'revenue minus cost of sold cards',
      color: profit >= 0 ? 'text-green-400' : 'text-red-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map(item => (
        <div key={item.label} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.label}</p>
          <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          <p className="text-xs text-gray-600 mt-0.5">{item.sub}</p>
        </div>
      ))}
    </div>
  )
}

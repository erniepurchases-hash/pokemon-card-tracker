'use client'

import { useState } from 'react'
import { Card } from '@/lib/supabase'

type Props = {
  cards: Card[]
  onEdit: (card: Card) => void
  onDelete: (id: string) => void
}

type SortKey = keyof Card
type SortDir = 'asc' | 'desc'

const fmt$ = (n: number | null) => (n != null ? `$${n.toFixed(2)}` : '—')
const fmtDate = (s: string | null) =>
  s ? new Date(s + 'T12:00:00').toLocaleDateString() : '—'

// Sticky column widths — must match between th and td
const BUY_DATE_W = 'w-32'   // 128px
const CARD_LEFT  = 'left-32' // offset = width of Buy Date column

const SCROLL_COLS: { key: SortKey; label: string; align?: string }[] = [
  { key: 'set_source',              label: 'Set' },
  { key: 'quantity',                label: 'Qty',        align: 'text-center' },
  { key: 'purchase_price_per_unit', label: 'Price/Unit', align: 'text-right'  },
  { key: 'total_cost',              label: 'Total Cost', align: 'text-right'  },
  { key: 'payment_method',          label: 'Payment'                          },
  { key: 'seller',                  label: 'Seller'                           },
  { key: 'sale_date',               label: 'Sale Date'                        },
  { key: 'sale_price',              label: 'Sale Price', align: 'text-right'  },
  { key: 'platform',                label: 'Platform'                         },
  { key: 'net_profit',              label: 'Profit',     align: 'text-right'  },
  { key: 'status',                  label: 'Status',     align: 'text-center' },
  { key: 'notes',                   label: 'Notes'                            },
]

export default function CardTable({ cards, onEdit, onDelete }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'purchase_date',
    dir: 'desc',
  })
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set())

  const toggleSort = (key: SortKey) =>
    setSort(s =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )

  const toggleName = (id: string) =>
    setExpandedNames(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const sorted = [...cards].sort((a, b) => {
    const av = a[sort.key] ?? ''
    const bv = b[sort.key] ?? ''
    if (av < bv) return sort.dir === 'asc' ? -1 : 1
    if (av > bv) return sort.dir === 'asc' ? 1 : -1
    return 0
  })

  const sortIcon = (key: SortKey) =>
    sort.key === key ? <span className="ml-1 opacity-50">{sort.dir === 'asc' ? '↑' : '↓'}</span> : null

  const thBase = 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-300 transition-colors whitespace-nowrap'
  const thSticky = `${thBase} sticky z-20 bg-gray-800`
  // Freeze-line shadow on the second sticky column
  const cardThSticky = `${thSticky} ${CARD_LEFT} shadow-[2px_0_6px_rgba(0,0,0,0.5)]`

  if (cards.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-16 text-center">
        <p className="text-gray-600 text-sm">No cards found. Add your first card above.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-800">
              {/* Sticky col 1: Buy Date */}
              <th
                className={`${thSticky} left-0 text-left ${BUY_DATE_W}`}
                onClick={() => toggleSort('purchase_date')}
              >
                Buy Date {sortIcon('purchase_date')}
              </th>

              {/* Sticky col 2: Card */}
              <th
                className={`${cardThSticky} text-left`}
                onClick={() => toggleSort('card_name')}
              >
                Card {sortIcon('card_name')}
              </th>

              {/* Scrollable columns */}
              {SCROLL_COLS.map((col, i) => (
                <th
                  key={`${col.key}-${i}`}
                  onClick={() => toggleSort(col.key)}
                  className={`${thBase} ${col.align || 'text-left'}`}
                >
                  {col.label} {sortIcon(col.key)}
                </th>
              ))}
              <th className={`${thBase} text-right`}>% Profit</th>

              <th className="px-4 py-3 bg-gray-800" />
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-800">
            {sorted.map(card => {
              const isExpanded = expandedNames.has(card.id)
              const tdSticky = 'sticky z-10 px-4 py-3 bg-gray-900 group-hover:bg-gray-800 transition-colors'

              return (
                <tr key={card.id} className="hover:bg-gray-800 transition-colors group">

                  {/* Sticky col 1: Buy Date */}
                  <td className={`${tdSticky} left-0 text-gray-400 ${BUY_DATE_W}`}>
                    {fmtDate(card.purchase_date)}
                  </td>

                  {/* Sticky col 2: Card Name (expandable) */}
                  <td
                    className={`${tdSticky} ${CARD_LEFT} cursor-pointer shadow-[2px_0_6px_rgba(0,0,0,0.5)]`}
                    onClick={() => toggleName(card.id)}
                    title={isExpanded ? 'Click to collapse' : 'Click to expand'}
                  >
                    <span className={`font-medium text-gray-100 ${isExpanded ? 'whitespace-normal break-words max-w-xs block' : 'block max-w-[180px] truncate'}`}>
                      {card.card_name}
                    </span>
                    {!isExpanded && card.card_name.length > 24 && (
                      <span className="text-xs text-gray-600">↔</span>
                    )}
                  </td>

                  {/* Scrollable cells */}
                  <td className="px-4 py-3 text-gray-400">{card.set_source || '—'}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{card.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{fmt$(card.purchase_price_per_unit)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-200">{fmt$(card.total_cost)}</td>
                  <td className="px-4 py-3 text-gray-400">{card.payment_method || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{card.seller || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{fmtDate(card.sale_date)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{fmt$(card.sale_price)}</td>
                  <td className="px-4 py-3 text-gray-400">{card.platform || '—'}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    card.net_profit == null ? 'text-gray-600'
                    : card.net_profit >= 0   ? 'text-green-400'
                    :                          'text-red-400'
                  }`}>
                    {fmt$(card.net_profit)}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${
                    card.net_profit == null || card.total_cost == null ? 'text-gray-600'
                    : card.net_profit >= 0 ? 'text-green-400'
                    : 'text-red-400'
                  }`}>
                    {card.net_profit != null && card.total_cost
                      ? `${((card.net_profit / card.total_cost) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      card.status === 'in_stock'
                        ? 'bg-blue-900/50 text-blue-300'
                        : 'bg-green-900/50 text-green-300'
                    }`}>
                      {card.status === 'in_stock' ? 'In Stock' : 'Sold'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{card.notes || ''}</td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(card)}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(card.id)}
                        className="text-xs text-red-500 hover:text-red-400 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

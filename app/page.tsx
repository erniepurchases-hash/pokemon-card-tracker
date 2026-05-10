'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Card } from '@/lib/supabase'
import StatsBar from '@/components/StatsBar'
import CardTable from '@/components/CardTable'
import CardForm from '@/components/CardForm'

type Filter = 'all' | 'in_stock' | 'sold'

export default function Dashboard() {
  const [cards, setCards] = useState<Card[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false })
    setCards(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setSelectedIds(new Set()) }, [filter, search])

  const displayed = cards.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.card_name.toLowerCase().includes(q) ||
      c.set_source?.toLowerCase().includes(q) ||
      c.seller?.toLowerCase().includes(q) ||
      c.platform?.toLowerCase().includes(q) ||
      c.notes?.toLowerCase().includes(q)
    )
  })

  const handleEdit = (card: Card) => { setEditCard(card); setShowForm(true) }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this card entry?')) return
    await supabase.from('cards').delete().eq('id', id)
    load()
  }

  const handleClose = () => { setShowForm(false); setEditCard(null); load() }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    const allIds = displayed.map(c => c.id)
    setSelectedIds(prev => prev.size === allIds.length ? new Set() : new Set(allIds))
  }

  const handleBulkMarkSold = async () => {
    if (!confirm(`Mark ${selectedIds.size} card(s) as sold?`)) return
    await supabase.from('cards').update({ status: 'sold' }).in('id', [...selectedIds])
    setSelectedIds(new Set())
    load()
  }

  const handleExport = () => {
    const headers = [
      'Buy Date', 'Card Name', 'Set', 'Qty', 'Price/Unit', 'Total Cost',
      'Payment Method', 'Seller', 'Grading Fee', 'Sale Date', 'Sale Price',
      'Sold To', 'Sale Payment', 'Platform', 'Net Profit', '% Profit', 'Status', 'Notes',
    ]

    const rows = displayed.map(c => [
      c.purchase_date || '',
      c.card_name,
      c.set_source || '',
      c.quantity,
      c.purchase_price_per_unit ?? '',
      c.total_cost ?? '',
      c.payment_method || '',
      c.seller || '',
      c.grading_fee ?? '',
      c.sale_date || '',
      c.sale_price ?? '',
      c.sold_to || '',
      c.sale_payment_method || '',
      c.platform || '',
      c.net_profit ?? '',
      c.net_profit != null && c.total_cost
        ? ((c.net_profit / c.total_cost) * 100).toFixed(1) + '%'
        : '',
      c.status === 'in_stock' ? 'In Stock' : 'Sold',
      c.notes || '',
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pokemon-inventory-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Pokemon Card Tracker</h1>
          <p className="text-sm text-gray-500">Resale inventory &amp; profit dashboard</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => { setEditCard(null); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            + Add Card
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-screen-2xl mx-auto">
        <StatsBar cards={cards} />

        <div className="flex flex-wrap gap-3 items-center mt-6 mb-4">
          <div className="flex gap-2">
            {(['all', 'in_stock', 'sold'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-blue-500 hover:text-gray-200'
                }`}
              >
                {f === 'all' ? 'All' : f === 'in_stock' ? 'In Stock' : 'Sold'}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search cards..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 ml-auto w-56"
          />
          <p className="text-xs text-gray-600">
            {displayed.length} of {cards.length} {cards.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 bg-blue-950 border border-blue-800 rounded-lg px-4 py-2.5 mb-3">
            <span className="text-sm text-blue-300 font-medium">{selectedIds.size} selected</span>
            <button
              onClick={handleBulkMarkSold}
              className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Mark as Sold
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors ml-auto"
            >
              Clear selection
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-600 text-sm">Loading...</div>
        ) : (
          <CardTable
            cards={displayed}
            onEdit={handleEdit}
            onDelete={handleDelete}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
          />
        )}
      </main>

      {showForm && <CardForm card={editCard} onClose={handleClose} />}
    </div>
  )
}

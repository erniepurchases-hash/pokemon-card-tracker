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

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Pokemon Card Tracker</h1>
          <p className="text-sm text-gray-500">Resale inventory &amp; profit dashboard</p>
        </div>
        <button
          onClick={() => { setEditCard(null); setShowForm(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          + Add Card
        </button>
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

        {loading ? (
          <div className="text-center py-20 text-gray-600 text-sm">Loading...</div>
        ) : (
          <CardTable cards={displayed} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </main>

      {showForm && <CardForm card={editCard} onClose={handleClose} />}
    </div>
  )
}

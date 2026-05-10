'use client'

import { useState, FormEvent } from 'react'
import { supabase, Card } from '@/lib/supabase'

type Props = {
  card: Card | null
  onClose: () => void
}

type FormData = {
  card_name: string
  set_source: string
  quantity: string
  purchase_date: string
  purchase_price_per_unit: string
  payment_method: string
  seller: string
  sale_date: string
  sale_price: string
  grading_fee: string
  sold_to: string
  sale_payment_method: string
  platform: string
  status: 'in_stock' | 'sold'
  notes: string
}

const PAYMENT_METHODS = ['Cash', 'PayPal', 'Venmo', 'CashApp', 'Credit Card', 'Bank Transfer', 'Other']
const PLATFORMS = ['eBay', 'TCGPlayer', 'Facebook Marketplace', 'Instagram', 'Whatnot', 'In Person', 'Other']

export default function CardForm({ card, onClose }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<FormData>({
    card_name: card?.card_name ?? '',
    set_source: card?.set_source ?? '',
    quantity: String(card?.quantity ?? 1),
    purchase_date: card?.purchase_date ?? '',
    purchase_price_per_unit: card?.purchase_price_per_unit != null ? String(card.purchase_price_per_unit) : '',
    payment_method: card?.payment_method ?? '',
    seller: card?.seller ?? '',
    sale_date: card?.sale_date ?? '',
    sale_price: card?.sale_price != null ? String(card.sale_price) : '',
    grading_fee: card?.grading_fee != null ? String(card.grading_fee) : '',
    sold_to: card?.sold_to ?? '',
    sale_payment_method: card?.sale_payment_method ?? '',
    platform: card?.platform ?? '',
    status: card?.status ?? 'in_stock',
    notes: card?.notes ?? '',
  })

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }))
  const nn = (v: string) => v.trim() || null
  const nf = (v: string) => (v.trim() ? parseFloat(v) : null)
  const ni = (v: string) => (v.trim() ? parseInt(v, 10) : 1)

  const totalPreview = nf(form.purchase_price_per_unit) != null && ni(form.quantity) > 0
    ? (nf(form.purchase_price_per_unit)! * ni(form.quantity)).toFixed(2)
    : null

  const profitPreview =
    totalPreview && nf(form.sale_price) != null
      ? (nf(form.sale_price)! - parseFloat(totalPreview) - (nf(form.grading_fee) ?? 0)).toFixed(2)
      : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.card_name.trim()) return setError('Card name is required')
    setSaving(true)
    setError('')

    const payload = {
      card_name: form.card_name.trim(),
      set_source: nn(form.set_source),
      quantity: ni(form.quantity),
      purchase_date: nn(form.purchase_date),
      purchase_price_per_unit: nf(form.purchase_price_per_unit),
      payment_method: nn(form.payment_method),
      seller: nn(form.seller),
      sale_date: form.status === 'sold' ? nn(form.sale_date) : null,
      sale_price: form.status === 'sold' ? nf(form.sale_price) : null,
      grading_fee: nf(form.grading_fee),
      sold_to: form.status === 'sold' ? nn(form.sold_to) : null,
      sale_payment_method: form.status === 'sold' ? nn(form.sale_payment_method) : null,
      platform: form.status === 'sold' ? nn(form.platform) : null,
      status: form.status,
      notes: nn(form.notes),
    }

    const { error: err } = card
      ? await supabase.from('cards').update(payload).eq('id', card.id)
      : await supabase.from('cards').insert(payload)

    setSaving(false)
    if (err) return setError(err.message)
    onClose()
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 text-gray-100 placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500'
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-100">{card ? 'Edit Card' : 'Add Card'}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* Basic */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Card Name *</label>
              <input
                className={inputCls}
                value={form.card_name}
                onChange={e => set('card_name', e.target.value)}
                placeholder="e.g. Charizard VMAX"
              />
            </div>
            <div>
              <label className={labelCls}>Set / Source</label>
              <input
                className={inputCls}
                value={form.set_source}
                onChange={e => set('set_source', e.target.value)}
                placeholder="e.g. Brilliant Stars"
              />
            </div>
            <div>
              <label className={labelCls}>Quantity</label>
              <input
                type="number" min="1"
                className={inputCls}
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                className={inputCls + ' bg-gray-800'}
                value={form.status}
                onChange={e => set('status', e.target.value as 'in_stock' | 'sold')}
              >
                <option value="in_stock">In Stock</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>

          {/* Purchase */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Purchase</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Purchase Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.purchase_date}
                  onChange={e => set('purchase_date', e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Price Per Unit ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  className={inputCls}
                  value={form.purchase_price_per_unit}
                  onChange={e => set('purchase_price_per_unit', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={labelCls}>Payment Method</label>
                <input
                  list="payment-methods"
                  className={inputCls}
                  value={form.payment_method}
                  onChange={e => set('payment_method', e.target.value)}
                  placeholder="e.g. Cash"
                />
                <datalist id="payment-methods">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Seller</label>
                <input
                  className={inputCls}
                  value={form.seller}
                  onChange={e => set('seller', e.target.value)}
                  placeholder="e.g. Local shop"
                />
              </div>
              <div>
                <label className={labelCls}>Grading Fee ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  className={inputCls}
                  value={form.grading_fee}
                  onChange={e => set('grading_fee', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            {totalPreview && (
              <p className="text-xs text-gray-500 mt-2">
                Total cost: <span className="font-semibold text-gray-300">${totalPreview}</span>
              </p>
            )}
          </div>

          {/* Sale — only shown when status is sold */}
          {form.status === 'sold' && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Sale</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Sale Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.sale_date}
                    onChange={e => set('sale_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Sale Price ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    className={inputCls}
                    value={form.sale_price}
                    onChange={e => set('sale_price', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className={labelCls}>Sold To</label>
                  <input
                    className={inputCls}
                    value={form.sold_to}
                    onChange={e => set('sold_to', e.target.value)}
                    placeholder="e.g. Instagram buyer"
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <input
                    list="sale-payment-methods"
                    className={inputCls}
                    value={form.sale_payment_method}
                    onChange={e => set('sale_payment_method', e.target.value)}
                    placeholder="e.g. PayPal"
                  />
                  <datalist id="sale-payment-methods">
                    {PAYMENT_METHODS.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Platform Sold On</label>
                  <input
                    list="platforms"
                    className={inputCls}
                    value={form.platform}
                    onChange={e => set('platform', e.target.value)}
                    placeholder="e.g. eBay"
                  />
                  <datalist id="platforms">
                    {PLATFORMS.map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>
              </div>
              {profitPreview && (
                <p className="text-xs text-gray-500 mt-2">
                  Net profit:{' '}
                  <span className={`font-semibold ${parseFloat(profitPreview) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${profitPreview}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              rows={2}
              className={inputCls + ' resize-none'}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Condition, grading notes, etc."
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 justify-end pt-1 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? 'Saving...' : card ? 'Save Changes' : 'Add Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

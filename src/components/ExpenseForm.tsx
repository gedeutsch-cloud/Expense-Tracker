import { useState } from 'react'
import { CATEGORIES, type Category, type Expense } from '../types'

interface Props {
  onAdd: (expense: Expense) => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function ExpenseForm({ onAdd }: Props) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('Food')
  const [date, setDate] = useState(today())
  const [error, setError] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const value = Number(amount)
    if (!description.trim()) {
      setError('Add a description')
      return
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Amount must be greater than 0')
      return
    }
    onAdd({
      id: crypto.randomUUID(),
      description: description.trim(),
      amount: Math.round(value * 100) / 100,
      category,
      date,
    })
    setDescription('')
    setAmount('')
    setError('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold">Add an expense</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 block text-sm font-medium text-slate-700">
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Coffee with Sam"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Amount
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="12.50"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Add expense
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  )
}

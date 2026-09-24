import { useEffect, useMemo, useState } from 'react'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import Charts from './components/Charts'
import { loadExpenses, saveExpenses } from './storage'
import { formatCurrency, monthKey, monthLabel } from './format'
import { CATEGORIES, type Category, type Expense } from './types'

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [filter, setFilter] = useState<Category | 'All'>('All')

  useEffect(() => {
    saveExpenses(expenses)
  }, [expenses])

  const months = useMemo(() => {
    const keys = new Set(expenses.map((e) => monthKey(e.date)))
    keys.add(new Date().toISOString().slice(0, 7))
    return [...keys].sort().reverse()
  }, [expenses])

  const monthly = useMemo(
    () =>
      expenses
        .filter((e) => monthKey(e.date) === month)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, month],
  )

  const visible = useMemo(
    () => (filter === 'All' ? monthly : monthly.filter((e) => e.category === filter)),
    [monthly, filter],
  )

  const total = monthly.reduce((sum, e) => sum + e.amount, 0)
  const largest = monthly.reduce<Expense | null>(
    (max, e) => (max === null || e.amount > max.amount ? e : max),
    null,
  )

  function addExpense(expense: Expense) {
    setExpenses((prev) => [...prev, expense])
    setMonth(monthKey(expense.date))
  }

  function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Tracker</h1>
          <p className="text-sm text-slate-500">Everything is saved locally in your browser.</p>
        </div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900"
        >
          {months.map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </select>
      </header>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total this month" value={formatCurrency(total)} />
        <Stat label="Expenses logged" value={String(monthly.length)} />
        <Stat
          label="Largest expense"
          value={largest ? `${formatCurrency(largest.amount)} · ${largest.description}` : '—'}
        />
      </section>

      <div className="mb-6">
        <ExpenseForm onAdd={addExpense} />
      </div>

      <div className="mb-6">
        <Charts all={expenses} monthly={monthly} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(['All', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === c
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <ExpenseList expenses={visible} onDelete={deleteExpense} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold">{value}</p>
    </div>
  )
}

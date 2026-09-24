import { useEffect, useMemo, useRef, useState } from 'react'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import Charts from './components/Charts'
import CategoryReport from './components/CategoryReport'
import BudgetPanel from './components/BudgetPanel'
import { loadBudgets, loadExpenses, saveBudgets, saveExpenses } from './storage'
import { formatCurrency, formatWholeCurrency, monthKey, monthLabel } from './format'
import { buildReport } from './report'
import { downloadCsv, parseCsv } from './csv'
import { MONTHLY_BENCHMARK, MONTHLY_BENCHMARK_TOTAL } from './benchmark'
import { CATEGORIES, type Budgets, type Category, type Expense } from './types'

type Tab = 'Overview' | 'Report' | 'Budgets'
const TABS: Tab[] = ['Overview', 'Report', 'Budgets']

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses)
  const [budgets, setBudgets] = useState<Budgets>(loadBudgets)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [filter, setFilter] = useState<Category | 'All'>('All')
  const [tab, setTab] = useState<Tab>('Overview')
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    saveExpenses(expenses)
  }, [expenses])

  useEffect(() => {
    saveBudgets(budgets)
  }, [budgets])

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

  const rows = useMemo(() => buildReport(expenses, month, budgets), [expenses, month, budgets])

  const spentByCategory = useMemo(
    () =>
      Object.fromEntries(rows.map((row) => [row.category, row.spent])) as Record<Category, number>,
    [rows],
  )

  const total = monthly.reduce((sum, e) => sum + e.amount, 0)
  const budgetTotal = CATEGORIES.reduce((sum, c) => sum + budgets[c], 0)

  function addExpense(expense: Expense) {
    setExpenses((prev) => [...prev, expense])
    setMonth(monthKey(expense.date))
  }

  function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  function exportMonth() {
    downloadCsv(monthly, `expenses-${month}.csv`)
  }

  function exportAll() {
    downloadCsv(
      [...expenses].sort((a, b) => a.date.localeCompare(b.date)),
      'expenses-all.csv',
    )
  }

  async function importCsv(file: File) {
    const { expenses: imported, skipped } = parseCsv(await file.text())
    setExpenses((prev) => [...prev, ...imported])
    setNotice(
      `Imported ${imported.length} expense${imported.length === 1 ? '' : 's'}` +
        (skipped > 0 ? `, skipped ${skipped} unreadable row${skipped === 1 ? '' : 's'}` : ''),
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Tracker</h1>
          <p className="text-sm text-slate-500">Everything is saved locally in your browser.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportMonth}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Export month
          </button>
          <button
            onClick={exportAll}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Export all
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Import CSV
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importCsv(file)
              e.target.value = ''
            }}
          />
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
        </div>
      </header>

      {notice && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
          <button onClick={() => setNotice('')} className="text-xs underline">
            dismiss
          </button>
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total this month" value={formatCurrency(total)} />
        <Stat
          label="Budget"
          value={`${formatWholeCurrency(Math.max(budgetTotal - total, 0))} left of ${formatWholeCurrency(budgetTotal)}`}
          tone={total > budgetTotal ? 'bad' : 'normal'}
        />
        <Stat
          label="Typical Scotch Plains household"
          value={`${formatWholeCurrency(MONTHLY_BENCHMARK_TOTAL)}/mo`}
          tone={total > MONTHLY_BENCHMARK_TOTAL ? 'bad' : 'normal'}
        />
      </section>

      <nav className="mb-6 inline-flex rounded-lg bg-slate-100 p-1">
        {TABS.map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === name ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === 'Overview' && (
        <div className="space-y-6">
          <ExpenseForm onAdd={addExpense} />
          <Charts all={expenses} monthly={monthly} />
          <div>
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
        </div>
      )}

      {tab === 'Report' && <CategoryReport rows={rows} expenses={expenses} month={month} />}

      {tab === 'Budgets' && (
        <BudgetPanel
          budgets={budgets}
          spentByCategory={spentByCategory}
          onChange={(category, value) => setBudgets((prev) => ({ ...prev, [category]: value }))}
          onResetToBenchmark={() => setBudgets({ ...MONTHLY_BENCHMARK })}
        />
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone = 'normal',
}: {
  label: string
  value: string
  tone?: 'normal' | 'bad'
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-xl font-semibold ${tone === 'bad' ? 'text-red-600' : ''}`}>
        {value}
      </p>
    </div>
  )
}

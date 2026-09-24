import { Fragment, useState } from 'react'
import type { CategoryRow } from '../report'
import { CATEGORY_COLORS, type Category, type Expense } from '../types'
import { formatCurrency, formatWholeCurrency, monthKey } from '../format'
import { MONTHLY_BENCHMARK_TOTAL, SCOTCH_PLAINS_MEDIAN_INCOME, BENCHMARK_SOURCES } from '../benchmark'

interface Props {
  rows: CategoryRow[]
  expenses: Expense[]
  month: string
}

/** Spending above a reference point is bad, below is good. */
function Delta({ value }: { value: number }) {
  if (Math.round(value) === 0) return <span className="text-slate-400">even</span>
  const over = value > 0
  return (
    <span className={over ? 'text-red-600' : 'text-emerald-600'}>
      {over ? '+' : '−'}
      {formatCurrency(Math.abs(value))}
    </span>
  )
}

function BudgetRemaining({ value }: { value: number }) {
  if (value < 0) {
    return <span className="text-red-600">{formatCurrency(Math.abs(value))} over</span>
  }
  return <span className="text-slate-600">{formatCurrency(value)} left</span>
}

export default function CategoryReport({ rows, expenses, month }: Props) {
  const [open, setOpen] = useState<Category | null>(null)

  const monthTotal = rows.reduce((sum, row) => sum + row.spent, 0)
  const benchmarkDelta = monthTotal - MONTHLY_BENCHMARK_TOTAL

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">
          Versus a typical Scotch Plains household
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          You spent <span className="font-semibold text-slate-900">{formatCurrency(monthTotal)}</span>{' '}
          this month. A comparable Scotch Plains household spends about{' '}
          <span className="font-semibold text-slate-900">
            {formatWholeCurrency(MONTHLY_BENCHMARK_TOTAL)}
          </span>{' '}
          a month — you are <Delta value={benchmarkDelta} /> against that.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Benchmark: Scotch Plains median household income of{' '}
          {formatWholeCurrency(SCOTCH_PLAINS_MEDIAN_INCOME)} puts a household in the top national income
          quintile, which spends $150,342/yr (BLS 2024), split by the BLS category distribution and
          excluding retirement and insurance contributions.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {BENCHMARK_SOURCES.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="text-slate-500 underline decoration-dotted hover:text-slate-900"
            >
              {source.label}
            </a>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Spent</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3 text-right">Avg</th>
              <th className="px-4 py-3 text-right">Share</th>
              <th className="px-4 py-3 text-right">Budget left</th>
              <th className="px-4 py-3 text-right">vs Scotch Plains</th>
              <th className="px-4 py-3 text-right">vs last month</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const items = expenses
                .filter((e) => e.category === row.category && monthKey(e.date) === month)
                .sort((a, b) => b.date.localeCompare(a.date))
              const expanded = open === row.category
              return (
                <Fragment key={row.category}>
                  <tr
                    onClick={() => setOpen(expanded ? null : row.category)}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[row.category] }}
                        />
                        {row.category}
                        <span className="text-xs text-slate-400">{expanded ? '▾' : '▸'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(row.spent)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{row.count}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {row.count === 0 ? '—' : formatCurrency(row.average)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                      {(row.shareOfMonth * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <BudgetRemaining value={row.budgetRemaining} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <Delta value={row.vsBenchmark} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <Delta value={row.vsPrevious} />
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={8} className="px-6 py-3">
                        {items.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            Nothing logged in {row.category} this month.
                          </p>
                        ) : (
                          <ul className="space-y-1 text-xs text-slate-600">
                            {items.map((item) => (
                              <li key={item.id} className="flex justify-between">
                                <span>
                                  {item.date} · {item.description}
                                </span>
                                <span className="tabular-nums font-medium">
                                  {formatCurrency(item.amount)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { MONTHLY_BENCHMARK, MONTHLY_BENCHMARK_TOTAL } from '../benchmark'
import { formatCurrency, formatWholeCurrency } from '../format'
import { CATEGORIES, CATEGORY_COLORS, type Budgets, type Category } from '../types'

interface Props {
  budgets: Budgets
  spentByCategory: Record<Category, number>
  onChange: (category: Category, value: number) => void
  onResetToBenchmark: () => void
}

export default function BudgetPanel({
  budgets,
  spentByCategory,
  onChange,
  onResetToBenchmark,
}: Props) {
  const budgetTotal = CATEGORIES.reduce((sum, c) => sum + budgets[c], 0)
  const spentTotal = CATEGORIES.reduce((sum, c) => sum + spentByCategory[c], 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Monthly budgets</h3>
          <p className="text-xs text-slate-500">
            {formatCurrency(spentTotal)} spent of {formatWholeCurrency(budgetTotal)} budgeted
          </p>
        </div>
        <button
          onClick={onResetToBenchmark}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Reset to Scotch Plains benchmark ({formatWholeCurrency(MONTHLY_BENCHMARK_TOTAL)}/mo)
        </button>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const budget = budgets[category]
          const spent = spentByCategory[category]
          const pct = budget === 0 ? (spent > 0 ? 100 : 0) : Math.min((spent / budget) * 100, 100)
          const over = budget > 0 && spent > budget
          return (
            <div key={category}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-2 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                  />
                  {category}
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="tabular-nums">{formatCurrency(spent)} of</span>
                  <span className="text-slate-400">$</span>
                  <input
                    value={budget}
                    onChange={(e) => onChange(category, Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                    inputMode="decimal"
                    aria-label={`${category} monthly budget`}
                    className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right tabular-nums outline-none focus:border-slate-900"
                  />
                  <span className="hidden w-28 text-right text-slate-400 sm:inline">
                    benchmark {formatWholeCurrency(MONTHLY_BENCHMARK[category])}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-slate-900'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

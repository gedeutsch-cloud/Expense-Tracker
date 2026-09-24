import { CATEGORY_COLORS, type Expense } from '../types'
import { formatCurrency } from '../format'

interface Props {
  expenses: Expense[]
  onDelete: (id: string) => void
}

export default function ExpenseList({ expenses, onDelete }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No expenses for this month yet. Add one above to get started.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Description</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-t border-slate-100">
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{expense.date}</td>
              <td className="px-4 py-3 font-medium">{expense.description}</td>
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium"
                  style={{ color: CATEGORY_COLORS[expense.category] }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[expense.category] }}
                  />
                  {expense.category}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                {formatCurrency(expense.amount)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onDelete(expense.id)}
                  aria-label={`Delete ${expense.description}`}
                  className="rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

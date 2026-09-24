import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CATEGORY_COLORS, type Category, type Expense } from '../types'
import { formatCurrency, monthKey, monthLabel } from '../format'

interface Props {
  all: Expense[]
  monthly: Expense[]
}

function tooltipFormatter(value: unknown): string {
  return typeof value === 'number' ? formatCurrency(value) : String(value)
}

export default function Charts({ all, monthly }: Props) {
  const byCategory = Object.entries(
    monthly.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount
      return acc
    }, {}),
  ).map(([name, value]) => ({ name, value }))

  const byMonth = Object.entries(
    all.reduce<Record<string, number>>((acc, e) => {
      const key = monthKey(e.date)
      acc[key] = (acc[key] ?? 0) + e.amount
      return acc
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, total]) => ({ month: monthLabel(key).slice(0, 3), total }))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">This month by category</h3>
        {byCategory.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                {byCategory.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name as Category]} />
                ))}
              </Pie>
              <Tooltip formatter={tooltipFormatter} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Last 6 months</h3>
        {byMonth.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byMonth}>
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
              <Tooltip formatter={tooltipFormatter} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="total" fill="#0f172a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

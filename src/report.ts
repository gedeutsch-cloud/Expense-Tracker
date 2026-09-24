import { MONTHLY_BENCHMARK } from './benchmark'
import { CATEGORIES, type Budgets, type Category, type Expense } from './types'
import { monthKey } from './format'

export interface CategoryRow {
  category: Category
  spent: number
  count: number
  average: number
  shareOfMonth: number
  budget: number
  budgetRemaining: number
  benchmark: number
  vsBenchmark: number
  previous: number
  vsPrevious: number
}

export function previousMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const date = new Date(year, m - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function totalsByCategory(expenses: Expense[], month: string): Record<Category, number> {
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>
  for (const expense of expenses) {
    if (monthKey(expense.date) === month) totals[expense.category] += expense.amount
  }
  return totals
}

function countsByCategory(expenses: Expense[], month: string): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>
  for (const expense of expenses) {
    if (monthKey(expense.date) === month) counts[expense.category] += 1
  }
  return counts
}

export function buildReport(
  expenses: Expense[],
  month: string,
  budgets: Budgets,
): CategoryRow[] {
  const spent = totalsByCategory(expenses, month)
  const counts = countsByCategory(expenses, month)
  const prior = totalsByCategory(expenses, previousMonth(month))
  const monthTotal = CATEGORIES.reduce((sum, c) => sum + spent[c], 0)

  return CATEGORIES.map((category) => ({
    category,
    spent: spent[category],
    count: counts[category],
    average: counts[category] === 0 ? 0 : spent[category] / counts[category],
    shareOfMonth: monthTotal === 0 ? 0 : spent[category] / monthTotal,
    budget: budgets[category],
    budgetRemaining: budgets[category] - spent[category],
    benchmark: MONTHLY_BENCHMARK[category],
    vsBenchmark: spent[category] - MONTHLY_BENCHMARK[category],
    previous: prior[category],
    vsPrevious: spent[category] - prior[category],
  })).sort((a, b) => b.spent - a.spent)
}

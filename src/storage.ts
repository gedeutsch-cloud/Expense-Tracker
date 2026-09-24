import { MONTHLY_BENCHMARK } from './benchmark'
import { CATEGORIES, type Budgets, type Expense } from './types'

const EXPENSES_KEY = 'expense-tracker:expenses'
const BUDGETS_KEY = 'expense-tracker:budgets'

export function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Expense[]
  } catch {
    return []
  }
}

export function saveExpenses(expenses: Expense[]): void {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses))
}

export function loadBudgets(): Budgets {
  try {
    const raw = localStorage.getItem(BUDGETS_KEY)
    if (!raw) return { ...MONTHLY_BENCHMARK }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...MONTHLY_BENCHMARK }
    const stored = parsed as Partial<Record<string, unknown>>
    const budgets = { ...MONTHLY_BENCHMARK }
    for (const category of CATEGORIES) {
      const value = stored[category]
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        budgets[category] = value
      }
    }
    return budgets
  } catch {
    return { ...MONTHLY_BENCHMARK }
  }
}

export function saveBudgets(budgets: Budgets): void {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets))
}

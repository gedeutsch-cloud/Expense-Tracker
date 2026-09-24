export type Category =
  | 'Food'
  | 'Transport'
  | 'Housing'
  | 'Utilities'
  | 'Entertainment'
  | 'Health'
  | 'Shopping'
  | 'Other'

export const CATEGORIES: Category[] = [
  'Food',
  'Transport',
  'Housing',
  'Utilities',
  'Entertainment',
  'Health',
  'Shopping',
  'Other',
]

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#f97316',
  Transport: '#0ea5e9',
  Housing: '#8b5cf6',
  Utilities: '#14b8a6',
  Entertainment: '#ec4899',
  Health: '#ef4444',
  Shopping: '#eab308',
  Other: '#64748b',
}

export type Budgets = Record<Category, number>

export interface Expense {
  id: string
  description: string
  amount: number
  category: Category
  date: string
}

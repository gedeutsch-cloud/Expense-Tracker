import { CATEGORIES, type Category, type Expense } from './types'

const HEADER = ['date', 'description', 'category', 'amount']

function escapeCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCsv(expenses: Expense[]): string {
  const rows = expenses.map((e) =>
    [e.date, e.description, e.category, e.amount.toFixed(2)].map(escapeCell).join(','),
  )
  return [HEADER.join(','), ...rows].join('\n')
}

export function downloadCsv(expenses: Expense[], filename: string): void {
  const blob = new Blob([toCsv(expenses)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function splitRow(row: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i]
    if (quoted) {
      if (char === '"' && row[i + 1] === '"') {
        current += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        current += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells.map((cell) => cell.trim())
}

export interface ParseResult {
  expenses: Expense[]
  skipped: number
}

export function parseCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) return { expenses: [], skipped: 0 }

  const first = splitRow(lines[0]).map((cell) => cell.toLowerCase())
  const hasHeader = HEADER.every((column) => first.includes(column))
  const columns = hasHeader ? first : HEADER
  const body = hasHeader ? lines.slice(1) : lines

  const expenses: Expense[] = []
  let skipped = 0

  for (const line of body) {
    const cells = splitRow(line)
    const get = (name: string) => cells[columns.indexOf(name)] ?? ''
    const amount = Number(get('amount').replace(/[$,]/g, ''))
    const date = get('date')
    const category = get('category') as Category
    const description = get('description')

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !description
    ) {
      skipped += 1
      continue
    }

    expenses.push({
      id: crypto.randomUUID(),
      date,
      description,
      category: CATEGORIES.includes(category) ? category : 'Other',
      amount: Math.round(amount * 100) / 100,
    })
  }

  return { expenses, skipped }
}

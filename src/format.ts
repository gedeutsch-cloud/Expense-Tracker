const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const wholeCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
  return currency.format(value)
}

export function formatWholeCurrency(value: number): string {
  return wholeCurrency.format(value)
}

export function monthKey(date: string): string {
  return date.slice(0, 7)
}

export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

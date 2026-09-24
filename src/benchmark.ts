import { CATEGORIES, type Category } from './types'

/**
 * Benchmark for a typical Scotch Plains, NJ household.
 *
 * Scotch Plains township median household income is $183,655 (Census QuickFacts,
 * 2020-2024 in 2024 dollars), which sits in the top national income quintile
 * (lower bound $155,925 in 2024). The BLS Consumer Expenditure Survey reports
 * average annual expenditures of $150,342 for that quintile in 2024, split
 * across categories using the CE 2024 percent distribution of spending.
 *
 * Retirement contributions, Social Security deductions, and personal insurance
 * (12.5% of spending) are excluded: they are not things people log as expenses.
 */
export const BENCHMARK_SOURCES = [
  {
    label: 'Census QuickFacts — Scotch Plains township median household income $183,655',
    url: 'https://www.census.gov/quickfacts/fact/table/scotchplainstownshipunioncountynewjersey/',
  },
  {
    label: 'BLS Consumer Expenditures 2024 — top quintile spends $150,342/yr',
    url: 'https://www.bls.gov/news.release/archives/cesan_12192025.htm',
  },
  {
    label: 'BLS Consumer Expenditures 2024 — percent distribution by category',
    url: 'https://www.bls.gov/opub/reports/consumer-expenditures/2024/home.htm',
  },
]

export const SCOTCH_PLAINS_MEDIAN_INCOME = 183_655
export const TOP_QUINTILE_ANNUAL_SPEND = 150_342

/** Share of total CE spending, 2024, regrouped into this app's categories. */
const SHARE_OF_SPENDING: Record<Category, number> = {
  Food: 0.129,
  Housing: 0.243, // housing 33.4% less utilities (6.0%) and furnishings (3.1%)
  Utilities: 0.06,
  Transport: 0.17,
  Health: 0.079,
  Entertainment: 0.046,
  Shopping: 0.068, // apparel 2.5% + furnishings 3.1% + personal care 1.2%
  Other: 0.079, // education, cash contributions, reading, tobacco, alcohol, misc
}

export const MONTHLY_BENCHMARK: Record<Category, number> = CATEGORIES.reduce(
  (acc, category) => {
    acc[category] = Math.round((TOP_QUINTILE_ANNUAL_SPEND * SHARE_OF_SPENDING[category]) / 12)
    return acc
  },
  {} as Record<Category, number>,
)

export const MONTHLY_BENCHMARK_TOTAL = CATEGORIES.reduce(
  (sum, category) => sum + MONTHLY_BENCHMARK[category],
  0,
)

# Expense Tracker

A small React + TypeScript app for logging expenses, filtering by category, and seeing where the money goes. Data is stored in the browser's `localStorage`, so there's no backend to run.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Other commands

```bash
npm run build   # type-check and produce a production build in dist/
npm run lint    # lint the source
```

## What it does

- **Overview** — add expenses, filter by category, donut chart of the month and a 6-month bar chart
- **Report** — per-category totals, item counts, averages, share of the month, budget left, change vs. last month, and how each category compares with a typical Scotch Plains household
- **Budgets** — an editable monthly budget per category with progress bars, defaulting to the Scotch Plains benchmark
- **CSV** — export the current month or everything, and import a CSV back in (`date,description,category,amount`)

`public/sample-expenses.csv` has six months of made-up data; import it to see the reports populated.

## The Scotch Plains benchmark

Scotch Plains township's median household income is $183,655 ([Census QuickFacts](https://www.census.gov/quickfacts/fact/table/scotchplainstownshipunioncountynewjersey/), 2020–2024 in 2024 dollars), which falls in the top national income quintile (lower bound $155,925). Households in that quintile spend an average of $150,342/yr ([BLS Consumer Expenditures 2024](https://www.bls.gov/news.release/archives/cesan_12192025.htm)), which is split across categories using the [BLS 2024 percent distribution of spending](https://www.bls.gov/opub/reports/consumer-expenditures/2024/home.htm), excluding retirement and insurance contributions. That works out to roughly $10,950/month. See `src/benchmark.ts`.

## How it's put together

- `src/App.tsx` — page layout, tabs, month selection, CSV import/export wiring
- `src/components/ExpenseForm.tsx` — the add-expense form and its validation
- `src/components/ExpenseList.tsx` — the expense table
- `src/components/Charts.tsx` — category donut chart and 6-month bar chart (recharts)
- `src/components/CategoryReport.tsx` — per-category report, expandable into its transactions
- `src/components/BudgetPanel.tsx` — budget editing and progress
- `src/report.ts` — the per-category math (budget, benchmark, prior-month deltas)
- `src/benchmark.ts` — the Scotch Plains benchmark and its sources
- `src/csv.ts` — CSV reading and writing
- `src/storage.ts` — load/save expenses and budgets in `localStorage`
- `src/types.ts` — the `Expense` shape and category list/colors

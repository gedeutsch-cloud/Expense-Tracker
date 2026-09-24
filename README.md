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

## How it's put together

- `src/App.tsx` — page layout, month selection, category filter, summary stats
- `src/components/ExpenseForm.tsx` — the add-expense form and its validation
- `src/components/ExpenseList.tsx` — the expense table
- `src/components/Charts.tsx` — category donut chart and 6-month bar chart (recharts)
- `src/storage.ts` — load/save to `localStorage`
- `src/types.ts` — the `Expense` shape and category list/colors

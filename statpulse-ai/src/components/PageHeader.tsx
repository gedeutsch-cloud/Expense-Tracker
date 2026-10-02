export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">{eyebrow}</div>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm text-slate-400">{description}</p>}
      </div>
      {children}
    </div>
  );
}

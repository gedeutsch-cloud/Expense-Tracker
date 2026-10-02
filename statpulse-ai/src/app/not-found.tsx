import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <h1 className="text-2xl font-bold text-white">Not found</h1>
      <p className="mt-2 text-sm text-slate-400">That player or page doesn&apos;t exist in this simulated league.</p>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-ink-950">
        Back to dashboard
      </Link>
    </div>
  );
}

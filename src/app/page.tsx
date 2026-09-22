/**
 * Bootstrap placeholder. Owned by EWE-68 (slice A,
 * branch `feat/ewe-68-69-briefing-and-evidence-ui`), which replaces this file
 * with the real single-page briefing.
 */
export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-2">Squad Screen</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Match intelligence MVP</h1>
      </div>
      <p className="text-ink-1">
        Repository scaffold is in place. The single-page fixture briefing, evidence drawer and
        availability what-if are not built yet.
      </p>
      <p className="rounded-lg border border-surface-3 bg-surface-1 px-4 py-3 font-mono text-sm text-ink-2">
        Placeholder screen — not a product state. Replaced by EWE-68.
      </p>
    </main>
  );
}

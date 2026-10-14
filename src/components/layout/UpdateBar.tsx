import { AnimatePresence, m } from 'motion/react';
import { RefreshCw, Sparkles } from 'lucide-react';

/** Slides in when a newer version is live, so an open tab never keeps running old code. */
export function UpdateBar({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <m.div
          role="status"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="relative z-30 mx-auto mt-1 flex w-[min(30rem,calc(100%-1.5rem))] items-center gap-3 rounded-2xl border border-accent/40 bg-surface px-3 py-2 shadow-md"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-sm">
            <strong className="block leading-tight">A new version is ready</strong>
            <span className="text-xs text-muted">Update to get the latest features and fixes.</span>
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-ink px-3 text-sm font-semibold text-ink-text transition hover:opacity-90 active:scale-[0.97]"
          >
            <RefreshCw className="size-3.5" aria-hidden /> Update
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}

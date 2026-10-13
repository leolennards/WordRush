import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ScrollText, Sparkles, type LucideIcon } from 'lucide-react';
import { TIMING } from '@/config/game';
import { Celebration } from './Celebration';

/** A celebratory card instead of a plain line of text. */
export interface Reward {
  kind: 'achievement' | 'level' | 'quest';
  /** Small line above the title, e.g. "Achievement unlocked". */
  eyebrow: string;
  title: string;
  detail?: string;
  /** Icon for achievements; levels show their number, quests a scroll. */
  icon?: LucideIcon;
  /** Level number for level-ups. */
  level?: number;
}

interface Toast {
  id: number;
  text: string;
  tone: 'neutral' | 'success' | 'error';
  duration: number;
  reward?: Reward;
}

interface ToastContextValue {
  toast: (text: string, opts?: { tone?: Toast['tone']; duration?: number; reward?: Reward }) => void;
  /** Politely announce text to screen readers without a visible toast. */
  announce: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const nextId = useRef(1);

  const announce = useCallback((text: string) => {
    // Clear first so repeating the same message is announced again.
    setAnnouncement('');
    requestAnimationFrame(() => setAnnouncement(text));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    (text, opts) => {
      const id = nextId.current++;
      setToasts((prev) => [
        // Keep a few; replace an identical message instead of stacking it.
        ...prev.filter((t) => t.text !== text).slice(-4),
        {
          id,
          text,
          tone: opts?.tone ?? 'neutral',
          duration: opts?.duration ?? (opts?.reward ? 3400 : TIMING.toast),
          reward: opts?.reward,
        },
      ]);
      announce(text);
    },
    [announce],
  );

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  const value = useMemo(() => ({ toast, announce }), [toast, announce]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+7.25rem)] z-50 sm:top-[8.5rem] flex flex-col items-center gap-2 px-4">
        <AnimatePresence initial={false}>
          {toasts
            .filter((t) => !t.reward)
            .map((t) => (
              <ToastItem key={t.id} toast={t} onDone={dismiss} />
            ))}
        </AnimatePresence>
      </div>
      {/* Rewards slide in along the top edge, clear of dialogs' content. */}
      <div className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] flex flex-col items-center gap-1.5 px-4">
        <AnimatePresence initial={false}>
          {toasts
            .filter((t) => t.reward)
            .slice(-2)
            .map((t) => (
              <ToastItem key={t.id} toast={t} onDone={dismiss} />
            ))}
        </AnimatePresence>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">
        {announcement}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  useEffect(() => {
    if (!Number.isFinite(toast.duration)) return;
    const t = window.setTimeout(() => onDone(toast.id), toast.duration);
    return () => window.clearTimeout(t);
  }, [toast, onDone]);

  if (toast.reward) return <RewardCard reward={toast.reward} />;
  const tone = toast.tone === 'success' ? 'bg-correct text-correct-ink' : 'bg-ink text-ink-text';

  return (
    <m.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md ${tone}`}
    >
      {toast.text}
    </m.div>
  );
}

const REWARD_STYLE: Record<Reward['kind'], { tile: string; glow: string }> = {
  achievement: { tile: 'reward-tile-gold', glow: 'var(--c-present)' },
  level: { tile: 'bg-ink text-ink-text', glow: 'var(--c-accent)' },
  quest: { tile: 'bg-correct text-correct-ink', glow: 'var(--c-correct)' },
};

function RewardCard({ reward }: { reward: Reward }) {
  const style = REWARD_STYLE[reward.kind];
  const Icon = reward.icon ?? (reward.kind === 'quest' ? ScrollText : Sparkles);
  const card = (
    <m.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className="reward-card relative flex w-[min(21rem,calc(100vw-2rem))] items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface/95 p-2 pr-4 text-text shadow-lg backdrop-blur-md"
      style={{ ['--glow' as string]: style.glow }}
    >
      <m.span
        initial={{ scale: 0.4, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.08 }}
        className={`relative grid size-10 shrink-0 place-items-center rounded-xl text-base font-extrabold ${style.tile}`}
      >
        {reward.kind === 'level' && reward.level !== undefined ? reward.level : <Icon className="size-5" aria-hidden />}
      </m.span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[0.62rem] font-bold tracking-[0.12em] text-muted uppercase">{reward.eyebrow}</span>
        <span className="block truncate text-[0.9rem] leading-tight font-bold">{reward.title}</span>
        {reward.detail && <span className="block truncate text-[0.72rem] text-muted">{reward.detail}</span>}
      </span>
    </m.div>
  );
  if (reward.kind !== 'level') return card;
  // Level-ups get a burst of tiles behind the card.
  return (
    <div className="relative">
      <Celebration seed={reward.level ?? 1} />
      {card}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

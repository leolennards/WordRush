import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useFriends } from '@/features/friends/FriendsContext';
import { useToast } from '@/components/layout/Toasts';

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

/** Links the current profile to Google (or loads the Google account's existing profile). */
export function GoogleButton({ label, className = '' }: { label: string; className?: string }) {
  const f = useFriends();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const result = await f.signInWithGoogle();
      if (result === 'linked') toast('Saved to your Google account', { tone: 'success' });
      else if (result === 'switched') toast('Welcome back! Your profile is loaded', { tone: 'success' });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Google sign-in failed', { duration: 3500 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className={`inline-flex min-h-11 items-center justify-center gap-2.5 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-text transition hover:bg-surface-2 active:scale-[0.98] disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <GoogleMark />}
      {label}
    </button>
  );
}

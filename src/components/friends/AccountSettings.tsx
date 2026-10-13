import { useState } from 'react';
import { Cloud, Loader2, LogOut, UserRound } from 'lucide-react';
import { useFriends } from '@/features/friends/FriendsContext';
import { useToast } from '@/components/layout/Toasts';
import { Button } from '@/components/ui';
import { GoogleButton } from './GoogleButton';

/** Sign in with Google (or out) from Settings, without going through Friends. */
export function AccountSettings() {
  const f = useFriends();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (f.status === 'unavailable') return null;
  const account = f.account;
  const signedIn = account && !account.isAnonymous;

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full ${signedIn ? 'bg-correct/15 text-correct' : 'bg-surface-2 text-muted'}`}
          >
            {signedIn ? <Cloud className="size-5" aria-hidden /> : <UserRound className="size-5" aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold">Account</span>
            <span className="block truncate text-sm text-muted">
              {f.status === 'connecting' && !account ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden /> Connecting…
                </span>
              ) : signedIn ? (
                <>Signed in{account.email ? <> as <span className="text-text">{account.email}</span></> : ' with Google'}</>
              ) : account ? (
                'Guest on this device'
              ) : (
                'Not signed in'
              )}
            </span>
          </span>
        </span>
        {signedIn ? (
          !confirming && (
            <Button variant="secondary" className="min-h-10" onClick={() => setConfirming(true)}>
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          )
        ) : (
          <GoogleButton label="Sign in with Google" className="min-h-10" />
        )}
      </div>
      {!signedIn && (
        <p className="mt-2 text-xs text-muted">
          Keeps your Friends profile, friend code and friends safe, and brings them to your other devices.
        </p>
      )}
      {f.error && !signedIn && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {f.error}
        </p>
      )}
      {confirming && (
        <div className="mt-3 space-y-2 rounded-xl bg-surface-2 p-3" role="alert">
          <p className="text-sm text-muted">
            You’ll continue as a guest on this device. Sign in again any time to get your profile back.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="min-h-10"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await f.signOut();
                  toast('Signed out');
                } catch (err) {
                  toast(err instanceof Error ? err.message : 'Couldn’t sign out', { duration: 3200 });
                } finally {
                  setBusy(false);
                  setConfirming(false);
                }
              }}
            >
              Sign out
            </Button>
            <Button variant="ghost" className="min-h-10" onClick={() => setConfirming(false)} autoFocus>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import type { ReactNode } from 'react';
import { Download, Plus, Share, Smartphone } from 'lucide-react';
import { BRAND } from '@/config/game';
import { Dialog } from './Dialog';

/** Where the latest signed Android app is published (see STORE_PUBLISHING.md). */
export const ANDROID_APK_URL = '/downloads/wordskiis-android.apk';

const isIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-surface-3 text-xs font-bold">{n}</span>
      <span className="text-sm leading-relaxed">{children}</span>
    </li>
  );
}

export function GetAppDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const iphoneFirst = isIOS();
  const android = (
    <section key="android" className="rounded-2xl bg-surface-2 p-4">
      <h3 className="flex items-center gap-2 font-bold">
        <Smartphone className="size-4" aria-hidden /> Android
      </h3>
      <a
        href={ANDROID_APK_URL}
        download
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 font-semibold text-ink-text shadow-sm transition hover:opacity-90"
      >
        <Download className="size-4" aria-hidden /> Download the Android app
      </a>
      <ol className="mt-3 space-y-2">
        <Step n={1}>Open the downloaded file.</Step>
        <Step n={2}>
          If Android asks, allow your browser to <strong>install unknown apps</strong> (just this once).
        </Step>
        <Step n={3}>Tap Install, then open {BRAND.name}.</Step>
      </ol>
      <p className="mt-3 text-xs text-muted">Free, no ads. Your friends code works the same in the app.</p>
    </section>
  );
  const iphone = (
    <section key="iphone" className="rounded-2xl bg-surface-2 p-4">
      <h3 className="flex items-center gap-2 font-bold">
        <Smartphone className="size-4" aria-hidden /> iPhone & iPad
      </h3>
      <ol className="mt-3 space-y-2">
        <Step n={1}>Open {BRAND.name} in <strong>Safari</strong>.</Step>
        <Step n={2}>
          Tap the Share button <Share className="inline size-4 align-text-bottom" aria-label="Share" />.
        </Step>
        <Step n={3}>
          Choose <strong>Add to Home Screen</strong> <Plus className="inline size-4 align-text-bottom" aria-hidden />
          , then tap Add.
        </Step>
      </ol>
      <p className="mt-3 text-xs text-muted">It opens full screen with its own icon and works offline.</p>
    </section>
  );

  return (
    <Dialog open={open} onClose={onClose} title={`Get the ${BRAND.name} app`}>
      <p className="pt-1 text-sm text-muted">
        Play from your home screen. Friends, challenges and races work across the app and the website.
      </p>
      <div className="mt-4 space-y-3">{iphoneFirst ? [iphone, android] : [android, iphone]}</div>
    </Dialog>
  );
}

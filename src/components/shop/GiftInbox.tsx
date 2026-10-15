import { useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Gift } from 'lucide-react';
import type { ShopItem } from '@/engine';
import type { Settings } from '@/lib/storage/schemas';
import { useFriends, type ReceivedGift } from '@/features/friends/FriendsContext';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { useToast } from '@/components/layout/Toasts';
import { SETTING_FOR } from './kinds';
import { Reveal, type Prize } from './Reveal';

/** Gifts from friends: a card pops up, and opening it shows what's inside. */
export function GiftInbox() {
  const f = useFriends();
  const { receiveGift } = useProgress();
  const { update } = useSettings();
  const { toast } = useToast();
  const [opening, setOpening] = useState<{ gift: ReceivedGift; prize: Prize | null } | null>(null);
  const [later, setLater] = useState<string[]>([]);
  const next = f.gifts.find((g) => !later.includes(g.id) && g.id !== opening?.gift.id);

  const open = async (gift: ReceivedGift) => {
    setOpening({ gift, prize: null });
    try {
      // Claim it first, so two devices can't both open the same gift.
      if (!(await f.claimGift(gift.id))) {
        setOpening(null);
        toast('That gift was already opened on another device');
        return;
      }
      const got = receiveGift({ id: gift.id, from: gift.from, kind: gift.kind, coins: gift.coins, item: gift.item });
      setOpening({ gift, prize: got ?? { item: null, coins: 0 } });
    } catch {
      setOpening(null);
      toast('Couldn’t open the gift. Check your connection and try again.');
    }
  };

  const use = (item: ShopItem) => update({ [SETTING_FOR[item.kind]]: item.ref } as Partial<Settings>);

  return (
    <>
      <AnimatePresence>
        {next && !opening && (
          <m.div
            key={next.id}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4"
            role="status"
          >
            <div className="flex w-full max-w-sm items-center gap-3 rounded-[var(--radius-card)] bg-gradient-to-br from-rose-500 to-fuchsia-600 p-3 text-white shadow-lg">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/20">
                <Gift className="mystery-wobble size-6" aria-hidden />
              </span>
              <p className="min-w-0 flex-1 text-sm leading-snug">
                <strong className="block">{f.nameOf(next.from)} sent you a gift!</strong>
                {f.gifts.length > 1 ? `${f.gifts.length} gifts waiting` : 'Open it to see what’s inside'}
              </p>
              <button
                type="button"
                onClick={() => setLater((l) => [...l, next.id])}
                className="rounded-lg px-2 py-2 text-xs font-semibold text-white/80 hover:text-white"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => void open(next)}
                className="rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-fuchsia-700 transition active:scale-95"
              >
                Open
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      {opening && (
        <Reveal
          kind="gift"
          eyebrow={`Gift from ${f.nameOf(opening.gift.from)}`}
          prize={opening.prize}
          onUse={use}
          onClose={() => setOpening(null)}
        />
      )}
    </>
  );
}

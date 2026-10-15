import { useState } from 'react';
import { Gift, Loader2 } from 'lucide-react';
import { GIFT_COINS, SHOP_ITEMS, coinBalance, onSale, type ShopItem } from '@/engine';
import { useServices } from '@/app/services';
import { useFriends } from '@/features/friends/FriendsContext';
import { useProgress } from '@/features/progress/ProgressContext';
import { Dialog } from '@/components/dialogs/Dialog';
import { useToast } from '@/components/layout/Toasts';
import { Coin } from '@/components/shop/Coin';
import { KIND_LABEL } from '@/components/shop/kinds';
import { Button, Segmented } from '@/components/ui';

/** Send a friend coins, or buy them something from the shop. */
export function GiftDialog({ friend, name, onClose }: { friend: string | null; name: string; onClose: () => void }) {
  const f = useFriends();
  const { progress, payForGift } = useProgress();
  const { now } = useServices();
  const { toast } = useToast();
  const [kind, setKind] = useState<'coins' | 'item'>('coins');
  const [coins, setCoins] = useState<number>(GIFT_COINS[1]);
  const [item, setItem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const balance = coinBalance(progress);
  const date = now();
  const items = SHOP_ITEMS.filter((i) => onSale(i, date));
  const chosen: ShopItem | null = kind === 'item' ? (items.find((i) => i.id === item) ?? null) : null;
  const cost = kind === 'coins' ? coins : (chosen?.price ?? 0);
  const canSend = cost > 0 && cost <= balance && !busy;

  const send = async () => {
    if (!friend || !canSend) return;
    setBusy(true);
    try {
      await f.sendGift(friend, kind === 'coins' ? { kind, coins } : { kind, item: chosen!.id });
      payForGift(cost);
      toast(`Gift sent to ${name}!`, { tone: 'success' });
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t send the gift');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={friend !== null}
      onClose={onClose}
      title={`Send ${name} a gift`}
      footer={
        <Button variant="primary" className="w-full" disabled={!canSend} onClick={() => void send()}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Gift className="size-4" aria-hidden />}
          {cost > balance ? `You need ${cost - balance} more coins` : `Send for ${cost} coins`}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="tabular flex items-center gap-1.5 text-sm text-muted">
          You have <Coin className="size-4" /> <strong className="text-text">{balance}</strong> coins.
        </p>
        <Segmented<'coins' | 'item'>
          label="Gift type"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'coins', label: 'Coins' },
            { value: 'item', label: 'Something from the shop' },
          ]}
          size="sm"
        />
        {kind === 'coins' ? (
          <div role="radiogroup" aria-label="How many coins" className="grid grid-cols-4 gap-2">
            {GIFT_COINS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={coins === c}
                onClick={() => setCoins(c)}
                className={`tabular flex flex-col items-center gap-1 rounded-xl border p-3 font-bold transition active:scale-95 ${
                  coins === c ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
                }`}
              >
                <Coin className="size-6" />
                {c}
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted">If {name} already owns it, they get its price in coins instead.</p>
            <div role="radiogroup" aria-label="Item to give" className="grid max-h-[40dvh] gap-1.5 overflow-y-auto pr-1">
              {items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  role="radio"
                  aria-checked={item === i.id}
                  onClick={() => setItem(i.id)}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    item === i.id ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{i.name}</span>
                    <span className="block text-xs text-muted capitalize">{KIND_LABEL[i.kind]}</span>
                  </span>
                  <span className="tabular flex shrink-0 items-center gap-1 text-sm font-bold">
                    <Coin className="size-4" /> {i.price}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

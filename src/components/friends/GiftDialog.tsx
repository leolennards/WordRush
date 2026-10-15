import { useState } from 'react';
import { Gift, Loader2, Users } from 'lucide-react';
import { GIFT_COINS, GIFT_MAX, GIFT_MIN, SHOP_ITEMS, coinBalance, onSale, type ShopItem } from '@/engine';
import { useServices } from '@/app/services';
import { useFriends } from '@/features/friends/FriendsContext';
import { useProgress } from '@/features/progress/ProgressContext';
import { Dialog } from '@/components/dialogs/Dialog';
import { useToast } from '@/components/layout/Toasts';
import { Coin } from '@/components/shop/Coin';
import { KIND_LABEL } from '@/components/shop/kinds';
import { Button, Segmented } from '@/components/ui';
import { Avatar } from './Avatar';

/**
 * Send a friend coins, or buy them something from the shop. Opened from a
 * friend's card (`friend` set) or from the shop, where you pick the friend first.
 */
export function GiftDialog({ open, friend: fixed, onClose }: { open: boolean; friend?: string; onClose: () => void }) {
  const f = useFriends();
  const { progress, payForGift } = useProgress();
  const { now } = useServices();
  const { toast } = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const [kind, setKind] = useState<'coins' | 'item'>('coins');
  const [coins, setCoins] = useState<number>(GIFT_COINS[1]);
  const [custom, setCustom] = useState('');
  const [item, setItem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const friend = fixed ?? picked;
  const name = friend ? f.nameOf(friend) : 'a friend';
  const balance = coinBalance(progress);
  const items = SHOP_ITEMS.filter((i) => onSale(i, now()));
  const chosen: ShopItem | null = kind === 'item' ? (items.find((i) => i.id === item) ?? null) : null;
  const customAmount = custom === '' ? null : Math.floor(Number(custom));
  const amount = customAmount ?? coins;
  const amountOk = Number.isFinite(amount) && amount >= GIFT_MIN && amount <= GIFT_MAX;
  const cost = kind === 'coins' ? (amountOk ? amount : 0) : (chosen?.price ?? 0);
  const canSend = friend !== null && cost > 0 && cost <= balance && !busy;
  const ready = f.status === 'ready';

  const send = async () => {
    if (!friend || !canSend) return;
    setBusy(true);
    try {
      await f.sendGift(friend, kind === 'coins' ? { kind, coins: amount } : { kind, item: chosen!.id });
      payForGift(cost);
      toast(kind === 'coins' ? `Sent ${amount} coins to ${name}!` : `Gift sent to ${name}!`, { tone: 'success' });
      setCustom('');
      setPicked(null);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t send the gift');
    } finally {
      setBusy(false);
    }
  };

  const label =
    friend === null
      ? 'Pick a friend first'
      : kind === 'coins' && !amountOk
        ? `Send ${GIFT_MIN} to ${GIFT_MAX.toLocaleString()} coins`
        : cost > balance
          ? `You need ${cost - balance} more coins`
          : kind === 'coins'
            ? `Send ${amount.toLocaleString()} coins`
            : `Send for ${cost} coins`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={fixed ? `Send ${name} a gift` : 'Send coins to a friend'}
      footer={
        ready ? (
          <Button variant="primary" className="w-full" disabled={!canSend} onClick={() => void send()}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Gift className="size-4" aria-hidden />}
            {label}
          </Button>
        ) : undefined
      }
    >
      {!ready ? (
        <p className="flex items-start gap-2 text-sm text-muted">
          <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
          Open Friends and add a friend with their code, then you can send them coins and gifts.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="tabular flex items-center gap-1.5 text-sm text-muted">
            You have <Coin className="size-4" /> <strong className="text-text">{balance.toLocaleString()}</strong> coins.
          </p>

          {!fixed &&
            (f.friends.length === 0 ? (
              <p className="text-sm text-muted">Add a friend on the Friends page first.</p>
            ) : (
              <div role="radiogroup" aria-label="Friend" className="flex flex-wrap gap-2">
                {f.friends.map((fr) => (
                  <button
                    key={fr.uid}
                    type="button"
                    role="radio"
                    aria-checked={picked === fr.uid}
                    onClick={() => setPicked(fr.uid)}
                    className={`flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm font-semibold transition active:scale-95 ${
                      picked === fr.uid ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
                    }`}
                  >
                    <Avatar uid={fr.uid} name={fr.profile?.name ?? '?'} size="sm" />
                    {fr.profile?.name ?? 'Friend'}
                  </button>
                ))}
              </div>
            ))}

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
            <>
              <div role="radiogroup" aria-label="How many coins" className="grid grid-cols-3 gap-2">
                {GIFT_COINS.map((c) => {
                  const on = customAmount === null && coins === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={`${c} coins`}
                      onClick={() => {
                        setCoins(c);
                        setCustom('');
                      }}
                      className={`tabular flex flex-col items-center gap-1 rounded-xl border p-3 font-bold transition active:scale-95 ${
                        on ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
                      }`}
                    >
                      <Coin className="size-6" shine={on} />
                      {c.toLocaleString()}
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="shrink-0 text-muted">Or any amount</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={GIFT_MIN}
                  max={GIFT_MAX}
                  step={1}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder={`${GIFT_MIN}–${GIFT_MAX}`}
                  aria-label="Custom amount of coins"
                  className="tabular min-h-10 w-full rounded-xl border border-border bg-surface px-3 font-bold outline-none focus:border-accent"
                />
              </label>
            </>
          ) : (
            <>
              <p className="text-xs text-muted">If {name} already owns it, they get its price in coins instead.</p>
              <div role="radiogroup" aria-label="Item to give" className="grid max-h-[36dvh] gap-1.5 overflow-y-auto pr-1">
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
      )}
    </Dialog>
  );
}

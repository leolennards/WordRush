import { useEffect } from 'react';
import { Check, Eye, EyeOff, Sparkles } from 'lucide-react';
import type { ShopItem } from '@/engine';
import type { Settings } from '@/lib/storage/schemas';
import { useSettings } from '@/features/settings/SettingsContext';
import { Dialog } from '@/components/dialogs/Dialog';
import { Coin } from './Coin';
import { ItemPreview } from './Previews';
import { KIND_LABEL, SETTING_FOR } from './kinds';

/** Kinds you can try on across the whole app before buying. */
const TRY_ON = new Set<ShopItem['kind']>(['skin', 'tiles', 'keys', 'bg', 'accent']);

const ROWS = [
  [
    { l: 'w', s: 'correct' },
    { l: 'o', s: 'absent' },
    { l: 'r', s: 'present' },
    { l: 'd', s: 'absent' },
    { l: 's', s: 'correct' },
  ],
  [
    { l: 't', s: 'correct' },
    { l: 'i', s: 'present' },
    { l: 'l', s: 'correct' },
    { l: 'e', s: 'absent' },
    { l: 's', s: 'correct' },
  ],
] as const;

/** A bigger look at a shop item: try it on, then buy it or use it. */
export function ItemSheet({
  item,
  price,
  owned,
  equipped,
  balance,
  onBuy,
  onUse,
  onClose,
}: {
  item: ShopItem;
  price: number;
  owned: boolean;
  equipped: boolean;
  balance: number;
  onBuy: (item: ShopItem) => void;
  onUse: (item: ShopItem) => void;
  onClose: () => void;
}) {
  const { shown, setPreview, resolvedTheme } = useSettings();
  const key = SETTING_FOR[item.kind];
  const trying = TRY_ON.has(item.kind) && shown[key] === item.ref && !equipped;

  // Stop trying it on when the sheet closes or changes item.
  useEffect(() => () => setPreview(null), [item, setPreview]);

  const short = balance < price;
  const tryOn = () => setPreview(trying ? null : ({ [key]: item.ref } as Partial<Settings>));
  const board = item.kind === 'skin' || item.kind === 'tiles' || item.kind === 'keys' || item.kind === 'accent' || item.kind === 'bg';

  return (
    <Dialog
      open
      onClose={onClose}
      title={item.name}
      footer={
        <div className="flex gap-2">
          {TRY_ON.has(item.kind) && !owned && (
            <button
              type="button"
              onClick={tryOn}
              aria-pressed={trying}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-bold transition hover:bg-surface-3 active:scale-[0.98]"
            >
              {trying ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              {trying ? 'Stop' : 'Try it on'}
            </button>
          )}
          {owned ? (
            <button
              type="button"
              disabled={equipped}
              onClick={() => onUse(item)}
              className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 font-bold transition active:scale-[0.98] ${
                equipped ? 'bg-accent/15 text-accent' : 'bg-accent text-accent-ink'
              }`}
            >
              {equipped ? (
                <>
                  <Check className="size-4" aria-hidden /> In use
                </>
              ) : (
                'Use it'
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={short}
              onClick={() => onBuy(item)}
              aria-label={short ? `${item.name}: ${price} coins, you need ${price - balance} more` : `Buy ${item.name} for ${price} coins`}
              className="buy-button inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-ink px-4 font-extrabold text-ink-text transition hover:opacity-90 active:scale-[0.98] disabled:bg-surface-2 disabled:text-muted"
            >
              <Coin className="size-5" shine={!short} />
              <span className="tabular">{price.toLocaleString()}</span>
              {price !== item.price && <span className="tabular text-sm font-semibold line-through opacity-60">{item.price}</span>}
              {short && <span className="text-sm font-semibold">· {price - balance} more to go</span>}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase">
          {KIND_LABEL[item.kind]}
          {item.animated && (
            <span className="inline-flex items-center gap-1 rounded-full bg-present/20 px-2 py-0.5 text-text">
              <Sparkles className="size-3" aria-hidden /> Animated
            </span>
          )}
          {item.season && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-danger">Limited time</span>}
        </p>

        {/* A big preview: a little board for anything that changes the board, the item itself otherwise. */}
        {board && item.kind !== 'bg' && item.kind !== 'accent' ? (
          <div
            className={`rounded-2xl bg-surface-2 p-4 ${resolvedTheme === 'dark' ? 'dark' : ''}`}
            data-skin={item.kind === 'skin' ? item.ref : shown.skin}
          >
            <div className="mx-auto grid max-w-[15rem] gap-1.5">
              {ROWS.map((row, r) => (
                <div key={r} className="grid grid-cols-5 gap-1.5">
                  {row.map((t, i) => (
                    <span
                      key={i}
                      className="tile aspect-square w-full text-lg!"
                      data-state={t.s}
                      {...(item.kind === 'tiles' ? { 'data-style': item.ref } : {})}
                    >
                      {t.l}
                    </span>
                  ))}
                </div>
              ))}
              {item.kind === 'keys' && (
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {['Q', 'W', 'E', 'R', 'T', 'Y', 'U'].map((k, i) => (
                    <span
                      key={k}
                      className="key grid h-10 place-items-center text-sm"
                      data-keyskin={item.ref}
                      data-state={i === 1 ? 'correct' : i === 3 ? 'present' : i === 5 ? 'absent' : undefined}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-center rounded-2xl bg-surface-2/60 p-4 [&>*]:max-w-[18rem]!">
            <ItemPreview item={item} />
          </div>
        )}

        <p className="text-sm text-muted">{item.description}</p>
        {TRY_ON.has(item.kind) && !owned && (
          <p className="text-xs text-subtle">“Try it on” shows it across the whole app until you close this.</p>
        )}
      </div>
    </Dialog>
  );
}

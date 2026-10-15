import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, Check, Clock3, Play, Sparkles, Tag } from 'lucide-react';
import { GAME } from '@/config/game';
import {
  COIN_REWARDS,
  SHOP_ITEMS,
  coinBalance,
  dailyDeal,
  dayIndexFor,
  owns,
  priceFor,
  type ShopItem,
  type SkinId,
  type TileStyleId,
  type WinFxId,
} from '@/engine';
import { useServices } from '@/app/services';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { useCountdown } from '@/hooks/useToday';
import { playCue } from '@/lib/audio/sound';
import { buzz } from '@/lib/haptics';
import { useToast } from '@/components/layout/Toasts';
import { Segmented } from '@/components/ui';
import { Celebration } from '@/components/layout/Celebration';
import { Coin } from './Coin';
import { Rolling } from './CoinChip';
import { DailyChest } from './DailyChest';
import { FxIcon } from './FxIcon';

type Tab = ShopItem['kind'];

const KIND_LABEL: Record<Tab, string> = { skin: 'tile colours', tiles: 'tile style', fx: 'win effect' };

const PREVIEW = [
  { l: 'w', s: 'correct' },
  { l: 'o', s: 'present' },
  { l: 'r', s: 'absent' },
  { l: 'd', s: 'correct' },
  { l: 's', s: 'present' },
] as const;

/** The shop: spend Wordskiis coins on tile colours and tile styles. */
export function ShopScreen({ onBack }: { onBack: () => void }) {
  const { progress, buy } = useProgress();
  const { settings, update, resolvedTheme } = useSettings();
  const { now } = useServices();
  const { toast } = useToast();
  const countdown = useCountdown(now);
  const day = dayIndexFor(now(), GAME.dailyEpoch);
  const deal = useMemo(() => dailyDeal(day), [day]);
  const [tab, setTab] = useState<Tab>('skin');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: string; key: number } | null>(null);
  const balance = coinBalance(progress);
  const dark = resolvedTheme === 'dark';

  // A confirm tap expires after a few seconds.
  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(null), 3500);
    return () => window.clearTimeout(t);
  }, [confirming]);

  const equipped = (item: ShopItem) =>
    item.kind === 'skin' ? settings.skin === item.ref : item.kind === 'tiles' ? settings.tileStyle === item.ref : settings.winFx === item.ref;
  const equip = (item: ShopItem) =>
    item.kind === 'skin'
      ? update({ skin: item.ref as SkinId })
      : item.kind === 'tiles'
        ? update({ tileStyle: item.ref as TileStyleId })
        : update({ winFx: item.ref as WinFxId });
  const reducedMotion = settings.reduceMotion;

  const press = (item: ShopItem) => {
    if (owns(progress, item.id)) {
      equip(item);
      return;
    }
    if (confirming !== item.id) {
      setConfirming(item.id);
      return;
    }
    setConfirming(null);
    const result = buy(item.id);
    if (!result.ok) {
      toast(result.reason === 'funds' ? 'Not enough coins yet' : 'You already own that');
      return;
    }
    equip(item);
    setBurst({ id: item.id, key: Date.now() });
    if (settings.sound) playCue('win');
    if (settings.haptics) buzz('win');
    toast(`Unlocked: ${item.name}`, {
      reward: {
        kind: 'achievement',
        eyebrow: 'New in your collection',
        title: item.name,
        detail: item.kind === 'skin' ? 'Tile colours, now on' : item.kind === 'tiles' ? 'Tile style, now on' : 'Plays when you win',
        icon: Sparkles,
      },
    });
  };

  const items = SHOP_ITEMS.filter((i) => i.kind === tab);
  const ownedCount = SHOP_ITEMS.filter((i) => owns(progress, i.id)).length;

  return (
    <main id="game" className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[44rem] px-4 pt-3 pb-10 sm:pt-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Back to home"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.05rem] leading-tight font-bold tracking-tight">Shop</h2>
            <p className="text-xs text-muted">
              {ownedCount} of {SHOP_ITEMS.length} collected
            </p>
          </div>
        </div>

        {/* Balance */}
        <m.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="shop-hero relative mt-4 overflow-hidden rounded-[var(--radius-card)] p-5 text-white shadow-md"
          aria-label="Your coins"
        >
          <span className="feature-card-shine" aria-hidden />
          <div className="relative flex items-center gap-4">
            <m.span
              animate={{ rotateY: [0, 360] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatDelay: 1.5,
              }}
            >
              <Coin className="size-14 drop-shadow-lg" />
            </m.span>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.14em] text-white/75 uppercase">Your coins</p>
              <p className="tabular text-4xl leading-none font-black">
                <Rolling value={balance} />
              </p>
            </div>
          </div>
          <p className="relative mt-3 text-[0.8rem] leading-snug text-white/85">
            Every game pays out coins with its XP, plus {COIN_REWARDS.achievement} per achievement, {COIN_REWARDS.level} per level
            and {COIN_REWARDS.rank} for a new rank.
          </p>
        </m.section>

        <DailyChest />

        {/* Today's deal */}
        <m.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="deal-card mt-4 rounded-[var(--radius-card)] p-[2px]"
          aria-label="Today's deal"
        >
          <div className="flex flex-col gap-3 rounded-[calc(var(--radius-card)-2px)] bg-surface p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] text-present uppercase">
                <Tag className="size-3.5" aria-hidden /> Today’s deal · 30% off
              </p>
              <p className="mt-0.5 text-lg font-extrabold">
                {deal.item.name}{' '}
                <span className="text-sm font-semibold text-muted">{KIND_LABEL[deal.item.kind]}</span>
              </p>
              <p className="tabular flex items-center gap-1 text-xs text-muted">
                <Clock3 className="size-3" aria-hidden /> New deal in {countdown}
              </p>
            </div>
            <Preview item={deal.item} dark={dark} skin={settings.skin} reducedMotion={reducedMotion} />
            <BuyButton
              item={deal.item}
              price={deal.price}
              was={deal.item.price}
              owned={owns(progress, deal.item.id)}
              equipped={equipped(deal.item)}
              confirming={confirming === deal.item.id}
              balance={balance}
              onPress={() => press(deal.item)}
            />
          </div>
        </m.section>

        <div className="mt-6 flex justify-center">
          <Segmented<Tab>
            label="Shop section"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'skin', label: 'Colours' },
              { value: 'tiles', label: 'Styles' },
              { value: 'fx', label: 'Win effects' },
            ]}
          />
        </div>

        <AnimatePresence mode="popLayout">
          <m.ul
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {items.map((item, i) => {
              const owned = owns(progress, item.id);
              const on = equipped(item);
              const price = priceFor(item, day);
              return (
                <m.li
                  key={item.id}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: i * 0.03,
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`shop-card relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface p-3 transition ${
                    on ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
                  }`}
                  data-owned={owned || undefined}
                >
                  {item.animated && (
                    <span className="absolute top-2 right-2 rounded-full bg-present/20 px-1.5 py-px text-[0.6rem] font-bold tracking-wide uppercase">
                      Animated
                    </span>
                  )}
                  {deal.item.id === item.id && !owned && (
                    <span className="absolute top-2 left-2 rounded-full bg-danger px-1.5 py-px text-[0.6rem] font-bold tracking-wide text-white uppercase">
                      −30%
                    </span>
                  )}
                  <div className="mt-4 mb-3 flex justify-center">
                    <Preview item={item} dark={dark} skin={settings.skin} reducedMotion={reducedMotion} />
                  </div>
                  <p className="font-bold">{item.name}</p>
                  <p className="mb-3 text-xs leading-snug text-muted">{item.description}</p>
                  <div className="mt-auto">
                    <BuyButton
                      item={item}
                      price={price}
                      was={price !== item.price ? item.price : undefined}
                      owned={owned}
                      equipped={on}
                      confirming={confirming === item.id}
                      balance={balance}
                      onPress={() => press(item)}
                    />
                  </div>
                  <AnimatePresence>{burst?.id === item.id && <CoinBurst key={burst.key} />}</AnimatePresence>
                </m.li>
              );
            })}
          </m.ul>
        </AnimatePresence>

        <p className="mt-6 text-center text-xs text-subtle">
          Rank themes unlock as you level up. Find everything you own in Settings → Tile theme.
        </p>
      </div>
    </main>
  );
}

/** Five tiles in the item's colours (or style), in your current colours/style otherwise. */
function Preview({ item, dark, skin, reducedMotion }: { item: ShopItem; dark: boolean; skin: SkinId; reducedMotion: boolean }) {
  if (item.kind === 'fx') return <FxPreview item={item} reducedMotion={reducedMotion} />;
  const isSkin = item.kind === 'skin';
  return (
    <div
      className={`grid w-full max-w-[12.5rem] grid-cols-5 gap-1 ${dark ? 'dark' : ''}`}
      data-skin={isSkin ? item.ref : skin}
      role="img"
      aria-label={`Preview of ${item.name}`}
    >
      {PREVIEW.map((t, i) => (
        <span
          key={i}
          className="tile aspect-square w-full text-sm!"
          data-state={t.s}
          {...(!isSkin ? { 'data-style': item.ref } : {})}
          aria-hidden
        >
          {t.l}
        </span>
      ))}
    </div>
  );
}

/** A win effect: tap to watch it play over the screen, as it does when you win. */
function FxPreview({ item, reducedMotion }: { item: ShopItem; reducedMotion: boolean }) {
  const [play, setPlay] = useState(0);
  const fx = item.ref as WinFxId;
  useEffect(() => {
    if (!play) return;
    const t = window.setTimeout(() => setPlay(0), 2600);
    return () => window.clearTimeout(t);
  }, [play]);
  return (
    <>
      <button
        type="button"
        onClick={() => setPlay((n) => n + 1)}
        className="group grid aspect-[5/1] w-full max-w-[12.5rem] place-items-center rounded-xl bg-surface-2 transition hover:bg-surface-3 active:scale-[0.97]"
        aria-label={`Watch ${item.name}`}
      >
        <span className="flex items-center gap-2 text-xs font-bold text-muted group-hover:text-text">
          <FxIcon id={fx} className="size-5" />
          <Play className="size-3.5 fill-current" aria-hidden /> Watch
        </span>
      </button>
      {play > 0 &&
        !reducedMotion &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-50" key={play}>
            <Celebration seed={play * 7 + item.price} fx={fx} />
          </div>,
          document.body,
        )}
    </>
  );
}

function BuyButton({
  item,
  price,
  was,
  owned,
  equipped,
  confirming,
  balance,
  onPress,
}: {
  item: ShopItem;
  price: number;
  was?: number;
  owned: boolean;
  equipped: boolean;
  confirming: boolean;
  balance: number;
  onPress: () => void;
}) {
  if (owned) {
    return (
      <button
        type="button"
        onClick={onPress}
        disabled={equipped}
        aria-label={equipped ? `${item.name} is on` : `Use ${item.name}`}
        className={`inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold transition active:scale-[0.98] sm:w-auto sm:min-w-28 ${
          equipped ? 'bg-accent/15 text-accent' : 'bg-surface-2 hover:bg-surface-3'
        }`}
      >
        {equipped ? (
          <>
            <Check className="size-4" aria-hidden /> In use
          </>
        ) : (
          'Use'
        )}
      </button>
    );
  }
  const short = balance < price;
  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-center">
      <button
        type="button"
        onClick={onPress}
        disabled={short}
        aria-label={
          short
            ? `${item.name}: ${price} coins, you need ${price - balance} more`
            : confirming
              ? `Confirm buying ${item.name} for ${price} coins`
              : `Buy ${item.name} for ${price} coins`
        }
        className={`buy-button relative inline-flex min-h-10 w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl px-3 text-sm font-bold transition active:scale-[0.97] disabled:cursor-not-allowed sm:w-auto sm:min-w-28 ${
          confirming ? 'bg-present text-present-ink' : short ? 'bg-surface-2 text-muted' : 'bg-ink text-ink-text hover:opacity-90'
        }`}
        data-confirm={confirming || undefined}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={confirming ? 'confirm' : 'price'}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="inline-flex items-center gap-1.5"
          >
            {confirming ? (
              'Tap to confirm'
            ) : (
              <>
                <Coin className="size-4" />
                <span className="tabular">{price}</span>
                {was !== undefined && <span className="tabular text-xs font-semibold line-through opacity-60">{was}</span>}
              </>
            )}
          </m.span>
        </AnimatePresence>
      </button>
      {short && (
        <span className="tabular text-center text-[0.7rem] text-subtle" aria-hidden>
          {price - balance} more to go
        </span>
      )}
    </div>
  );
}

/** Coins bursting out of a card after a purchase. */
function CoinBurst() {
  const coins = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 60 + (i % 3) * 18;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 20,
          r: (i % 2 ? 1 : -1) * (180 + i * 20),
        };
      }),
    [],
  );
  return (
    <m.div className="pointer-events-none absolute inset-0 grid place-items-center" exit={{ opacity: 0 }} aria-hidden>
      <m.span
        className="absolute inset-0 rounded-[inherit] bg-present/25"
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.9 }}
      />
      {coins.map((c, i) => (
        <m.span
          key={i}
          className="absolute"
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
          animate={{ x: c.x, y: c.y, scale: 1, opacity: 0, rotate: c.r }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Coin className="size-5" />
        </m.span>
      ))}
    </m.div>
  );
}

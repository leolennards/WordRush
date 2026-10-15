import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, Check, Clock3, Package, Snowflake, Sparkles, Tag } from 'lucide-react';
import { GAME } from '@/config/game';
import {
  COIN_REWARDS,
  FREEZE_PRICE,
  MAX_FREEZES,
  MYSTERY_PRICE,
  SHOP_ITEMS,
  coinBalance,
  dailyDeal,
  dayIndexFor,
  freezesHeld,
  mysteryPool,
  onSale,
  owns,
  priceFor,
  seasonDaysLeft,
  type ItemKind,
  type ShopItem,
} from '@/engine';
import type { Settings } from '@/lib/storage/schemas';
import { useServices } from '@/app/services';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { useCountdown } from '@/hooks/useToday';
import { playCue } from '@/lib/audio/sound';
import { buzz } from '@/lib/haptics';
import { useToast } from '@/components/layout/Toasts';
import { Coin } from './Coin';
import { Rolling } from './CoinChip';
import { DailyChest } from './DailyChest';
import { ItemPreview } from './Previews';
import { KIND_DETAIL, KIND_LABEL, SETTING_FOR } from './kinds';
import { Reveal, type Prize } from './Reveal';

const TABS: { value: ItemKind; label: string }[] = [
  { value: 'skin', label: 'Colours' },
  { value: 'tiles', label: 'Styles' },
  { value: 'keys', label: 'Keyboards' },
  { value: 'sound', label: 'Sounds' },
  { value: 'fx', label: 'Win effects' },
  { value: 'frame', label: 'Frames' },
  { value: 'badge', label: 'Badges' },
];

/** The shop: spend Wordskiis coins on looks, sounds, effects and extras. */
export function ShopScreen({ onBack }: { onBack: () => void }) {
  const { progress, buy, buyFreeze, openMystery } = useProgress();
  const { settings, update } = useSettings();
  const { now } = useServices();
  const { toast } = useToast();
  const countdown = useCountdown(now);
  const date = now();
  const day = dayIndexFor(date, GAME.dailyEpoch);
  const deal = dailyDeal(day);
  const [tab, setTab] = useState<ItemKind>('skin');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: string; key: number } | null>(null);
  const [mystery, setMystery] = useState<Prize | null>(null);
  const balance = coinBalance(progress);

  // A confirm tap expires after a few seconds.
  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(null), 3500);
    return () => window.clearTimeout(t);
  }, [confirming]);

  const equipped = (item: ShopItem) => settings[SETTING_FOR[item.kind]] === item.ref;
  const equip = (item: ShopItem) => update({ [SETTING_FOR[item.kind]]: item.ref } as Partial<Settings>);
  const celebrate = () => {
    if (settings.sound) playCue('win');
    if (settings.haptics) buzz('win');
  };

  /** Two taps: the first asks, the second confirms. Returns true on the confirming tap. */
  const confirmed = (id: string) => {
    if (confirming !== id) {
      setConfirming(id);
      return false;
    }
    setConfirming(null);
    return true;
  };

  const press = (item: ShopItem) => {
    if (owns(progress, item.id)) {
      equip(item);
      return;
    }
    if (!confirmed(item.id)) return;
    const result = buy(item.id);
    if (!result.ok) {
      toast(
        result.reason === 'funds'
          ? 'Not enough coins yet'
          : result.reason === 'season'
            ? 'That one’s not on sale right now'
            : 'You already own that',
      );
      return;
    }
    equip(item);
    setBurst((b) => ({ id: item.id, key: (b?.key ?? 0) + 1 }));
    celebrate();
    toast(`Unlocked: ${item.name}`, {
      reward: {
        kind: 'achievement',
        eyebrow: 'New in your collection',
        title: item.name,
        detail: item.kind === 'sound' && !settings.sound ? 'Turn on sound effects in Settings to hear it' : KIND_DETAIL[item.kind],
        icon: Sparkles,
      },
    });
  };

  const pressFreeze = () => {
    if (!confirmed('freeze')) return;
    const why = buyFreeze();
    if (why) {
      toast(why === 'full' ? `You can hold ${MAX_FREEZES} freezes at a time` : 'Not enough coins yet');
      return;
    }
    celebrate();
    toast('Streak freeze ready: a missed Daily won’t break your streak', { tone: 'success' });
  };

  const pressMystery = () => {
    if (!confirmed('mystery')) return;
    const result = openMystery();
    if (result === 'empty') toast('You already own everything a box can hold!');
    else if (result === 'funds') toast('Not enough coins yet');
    else setMystery({ item: result, coins: 0 });
  };

  const seasonal = SHOP_ITEMS.filter((i) => i.season && onSale(i, date));
  const season = seasonal[0]?.season;
  // Limited-time items have their own section while on sale, and join your collection afterwards.
  const items = SHOP_ITEMS.filter((i) => i.kind === tab && (!i.season || owns(progress, i.id)));
  const ownedCount = SHOP_ITEMS.filter((i) => owns(progress, i.id)).length;
  const held = freezesHeld(progress.owned);
  const boxLeft = mysteryPool(progress).length;

  const card = (item: ShopItem, i: number) => (
    <ItemCard
      key={item.id}
      item={item}
      index={i}
      price={priceFor(item, day)}
      deal={deal.item.id === item.id}
      owned={owns(progress, item.id)}
      equipped={equipped(item)}
      confirming={confirming === item.id}
      balance={balance}
      burst={burst?.id === item.id ? burst.key : null}
      onPress={() => press(item)}
    />
  );

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
            <m.span animate={{ rotateY: [0, 360] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.5 }}>
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
            and {COIN_REWARDS.rank} for a new rank. Bonuses: {COIN_REWARDS.firstGuess} for a first-guess solve,{' '}
            {COIN_REWARDS.allQuests} for finishing all three quests and {COIN_REWARDS.streakWeek} for every week of Daily streak.
          </p>
        </m.section>

        <DailyChest />

        {/* Limited time */}
        {season && (
          <m.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="season-card mt-4 rounded-[var(--radius-card)] p-4"
            data-season={season.name.toLowerCase()}
            aria-label={`${season.name} specials`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="text-lg font-extrabold">{season.name} specials</h3>
              <p className="tabular flex items-center gap-1 text-xs font-semibold opacity-85">
                <Clock3 className="size-3" aria-hidden /> Limited time · {seasonDaysLeft(season, date)} days left
              </p>
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{seasonal.map(card)}</ul>
          </m.section>
        )}

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
                {deal.item.name} <span className="text-sm font-semibold text-muted">{KIND_LABEL[deal.item.kind]}</span>
              </p>
              <p className="tabular flex items-center gap-1 text-xs text-muted">
                <Clock3 className="size-3" aria-hidden /> New deal in {countdown}
              </p>
            </div>
            <ItemPreview item={deal.item} />
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

        {/* Extras */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Extra
            tone="mystery"
            icon={<Package className="size-7" aria-hidden />}
            title="Mystery box"
            text={
              boxLeft
                ? `A random item you don’t own yet (${boxLeft} left). It could be worth up to 3,000 coins!`
                : 'You own everything a box can hold.'
            }
            price={MYSTERY_PRICE}
            action={confirming === 'mystery' ? 'Tap to confirm' : 'Open a box'}
            confirming={confirming === 'mystery'}
            disabled={!boxLeft || balance < MYSTERY_PRICE}
            onPress={pressMystery}
          />
          <Extra
            tone="freeze"
            icon={<Snowflake className="size-7" aria-hidden />}
            title="Streak freeze"
            text={`Covers a missed Daily Challenge so your streak carries on. You have ${held} of ${MAX_FREEZES}.`}
            price={FREEZE_PRICE}
            action={held >= MAX_FREEZES ? 'Fully stocked' : confirming === 'freeze' ? 'Tap to confirm' : 'Buy a freeze'}
            confirming={confirming === 'freeze'}
            disabled={held >= MAX_FREEZES || balance < FREEZE_PRICE}
            onPress={pressFreeze}
          />
        </div>

        <ShopTabs value={tab} onChange={setTab} />

        <AnimatePresence mode="popLayout">
          <m.ul
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            {items.map(card)}
          </m.ul>
        </AnimatePresence>

        <p className="mt-6 text-center text-xs text-subtle">
          Rank themes unlock as you level up. Switch between everything you own in Settings → Tile theme. Send gifts from a
          friend’s card on the Friends page.
        </p>
      </div>
      {mystery && <Reveal kind="mystery" eyebrow="Mystery box" prize={mystery} onUse={equip} onClose={() => setMystery(null)} />}
    </main>
  );
}

/** The shop's sections, scrollable sideways on a phone. */
function ShopTabs({ value, onChange }: { value: ItemKind; onChange: (v: ItemKind) => void }) {
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    active.current?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [value]);
  return (
    <div
      role="radiogroup"
      aria-label="Shop section"
      className="no-scrollbar -mx-4 mt-6 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:justify-center"
    >
      {TABS.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            ref={on ? active : undefined}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(t.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${
              on ? 'bg-ink text-ink-text shadow-sm' : 'bg-surface-2 text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ItemCard({
  item,
  index,
  price,
  deal,
  owned,
  equipped,
  confirming,
  balance,
  burst,
  onPress,
}: {
  item: ShopItem;
  index: number;
  price: number;
  deal: boolean;
  owned: boolean;
  equipped: boolean;
  confirming: boolean;
  balance: number;
  burst: number | null;
  onPress: () => void;
}) {
  return (
    <m.li
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`shop-card relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface p-3 text-text transition ${
        equipped ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
      }`}
      data-owned={owned || undefined}
    >
      {item.season && !owned ? (
        <span className="absolute top-2 right-2 rounded-full bg-danger/15 px-1.5 py-px text-[0.6rem] font-bold tracking-wide text-danger uppercase">
          Limited
        </span>
      ) : (
        item.animated && (
          <span className="absolute top-2 right-2 rounded-full bg-present/20 px-1.5 py-px text-[0.6rem] font-bold tracking-wide uppercase">
            Animated
          </span>
        )
      )}
      {deal && !owned && (
        <span className="absolute top-2 left-2 rounded-full bg-danger px-1.5 py-px text-[0.6rem] font-bold tracking-wide text-white uppercase">
          −30%
        </span>
      )}
      <div className="mt-4 mb-3 flex justify-center">
        <ItemPreview item={item} />
      </div>
      <p className="font-bold">{item.name}</p>
      <p className="mb-3 text-xs leading-snug text-muted">{item.description}</p>
      <div className="mt-auto">
        <BuyButton
          item={item}
          price={price}
          was={price !== item.price ? item.price : undefined}
          owned={owned}
          equipped={equipped}
          confirming={confirming}
          balance={balance}
          onPress={onPress}
        />
      </div>
      <AnimatePresence>{burst !== null && <CoinBurst key={burst} />}</AnimatePresence>
    </m.li>
  );
}

/** A special: the mystery box or a streak freeze. */
function Extra({
  tone,
  icon,
  title,
  text,
  price,
  action,
  confirming,
  disabled,
  onPress,
}: {
  tone: 'mystery' | 'freeze';
  icon: ReactNode;
  title: string;
  text: string;
  price: number;
  action: string;
  confirming: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const what = title.toLowerCase();
  return (
    <section className="extra-card flex flex-col gap-3 rounded-[var(--radius-card)] p-4 text-white shadow-md" data-tone={tone} aria-label={title}>
      <div className="flex items-start gap-3">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20 ${tone === 'mystery' && !disabled ? 'mystery-wobble' : ''}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-extrabold">{title}</p>
          <p className="text-[0.8rem] leading-snug text-white/85">{text}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onPress}
        disabled={disabled}
        aria-label={confirming ? `Confirm buying a ${what} for ${price} coins` : `Buy a ${what} for ${price} coins`}
        className="buy-button mt-auto inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-sm font-extrabold text-slate-900 transition hover:bg-white/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        data-confirm={confirming || undefined}
      >
        {action}
        {!confirming && (
          <span className="tabular inline-flex items-center gap-1 opacity-80">
            · <Coin className="size-4" /> {price}
          </span>
        )}
      </button>
    </section>
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
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 20, r: (i % 2 ? 1 : -1) * (180 + i * 20) };
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

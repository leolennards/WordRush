import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, Check, ChevronDown, Clock3, Package, Send, Snowflake, Sparkles, Tag } from 'lucide-react';
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
import { Segmented } from '@/components/ui';
import { GiftDialog } from '@/components/friends/GiftDialog';
import { Coin } from './Coin';
import { Rolling } from './CoinChip';
import { DailyChest } from './DailyChest';
import { ItemPreview } from './Previews';
import { KIND_DETAIL, KIND_LABEL, SETTING_FOR } from './kinds';
import { Reveal, type Prize } from './Reveal';
import { ItemSheet } from './ItemSheet';

type Group = 'game' | 'app' | 'profile';

const TABS: { value: ItemKind; label: string; group: Group }[] = [
  { value: 'skin', label: 'Colours', group: 'game' },
  { value: 'tiles', label: 'Styles', group: 'game' },
  { value: 'keys', label: 'Keyboards', group: 'game' },
  { value: 'sound', label: 'Sounds', group: 'game' },
  { value: 'fx', label: 'Win effects', group: 'game' },
  { value: 'bg', label: 'Backgrounds', group: 'app' },
  { value: 'accent', label: 'App colours', group: 'app' },
  { value: 'frame', label: 'Frames', group: 'profile' },
  { value: 'badge', label: 'Badges', group: 'profile' },
  { value: 'title', label: 'Titles', group: 'profile' },
  { value: 'banner', label: 'Banners', group: 'profile' },
];
const GROUP_OF = Object.fromEntries(TABS.map((t) => [t.value, t.group])) as Record<ItemKind, Group>;

/** The shop: spend Wordskiis coins on looks, sounds, effects and extras. */
export function ShopScreen({ onBack, onProfile }: { onBack: () => void; onProfile?: () => void }) {
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
  const [sending, setSending] = useState(false);
  const [viewing, setViewing] = useState<ShopItem | null>(null);
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
    setViewing(null);
    setBurst((b) => ({ id: item.id, key: (b?.key ?? 0) + 1 }));
    celebrate();
    toast(`Unlocked: ${item.name}`, {
      reward: {
        kind: 'achievement',
        eyebrow: 'New in your collection',
        title: item.name,
        detail:
          item.kind === 'sound' && !settings.sound ? 'Turn on sound effects in Settings to hear it' : KIND_DETAIL[item.kind],
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
    toast('Streak freeze ready: a missed Daily won’t break your streak', {
      tone: 'success',
    });
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
      burst={burst?.id === item.id ? burst.key : null}
      onPress={() => setViewing(item)}
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
            <Coin className="size-16" hero />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tracking-[0.14em] text-white/75 uppercase">Your coins</p>
              <p className="coin-hero-amount tabular text-4xl leading-none font-black">
                <Rolling value={balance} />
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSending(true)}
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/30 active:scale-95"
            >
              <Send className="size-3.5" aria-hidden /> Send coins
            </button>
          </div>
          <details className="group relative mt-3 text-[0.8rem] leading-snug text-white/85">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-semibold text-white/90 [&::-webkit-details-marker]:hidden">
              How to earn coins
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-1.5">
              Every game pays out coins with its XP, plus {COIN_REWARDS.achievement} per achievement, {COIN_REWARDS.level} per level
              and {COIN_REWARDS.rank} for a new rank. Bonuses: {COIN_REWARDS.firstGuess} for a first-guess solve,{' '}
              {COIN_REWARDS.allQuests} for finishing all three quests and {COIN_REWARDS.streakWeek} for every week of Daily streak.
            </p>
          </details>
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
            <ItemPreview item={deal.item} still />
            <button
              type="button"
              onClick={() => setViewing(deal.item)}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 text-sm font-extrabold text-ink-text transition hover:opacity-90 active:scale-[0.98]"
            >
              {owns(progress, deal.item.id) ? (
                'Owned'
              ) : (
                <>
                  <Coin className="size-4" /> <span className="tabular">{deal.price}</span>
                  <span className="tabular text-xs font-semibold line-through opacity-60">{deal.item.price}</span>
                </>
              )}
            </button>
          </div>
        </m.section>

        {/* Extras */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Extra
            tone="mystery"
            icon={<Package className="size-7" aria-hidden />}
            title="Mystery box"
            text={boxLeft ? 'A random item you don’t own yet.' : 'You own everything a box can hold.'}
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
            text={`Saves your streak if you miss a day. You have ${held} of ${MAX_FREEZES}.`}
            price={FREEZE_PRICE}
            action={held >= MAX_FREEZES ? 'Fully stocked' : confirming === 'freeze' ? 'Tap to confirm' : 'Buy a freeze'}
            confirming={confirming === 'freeze'}
            disabled={held >= MAX_FREEZES || balance < FREEZE_PRICE}
            onPress={pressFreeze}
          />
        </div>

        <div className="mt-6 flex justify-center">
          <Segmented<Group>
            label="Shop area"
            value={GROUP_OF[tab]}
            onChange={(g) => setTab(TABS.find((t) => t.group === g)!.value)}
            options={[
              { value: 'game', label: 'Game' },
              { value: 'app', label: 'App' },
              { value: 'profile', label: 'Profile' },
            ]}
          />
        </div>
        <ShopTabs value={tab} onChange={setTab} />
        {GROUP_OF[tab] === 'profile' && onProfile && (
          <p className="mt-2 text-center text-xs text-muted">
            Friends see these on your profile.{' '}
            <button type="button" onClick={onProfile} className="font-semibold text-accent underline-offset-2 hover:underline">
              Edit your profile and picture
            </button>
          </p>
        )}

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
          Switch between everything you own in Settings → Tile theme.
        </p>
      </div>
      <GiftDialog open={sending} onClose={() => setSending(false)} />
      {viewing && (
        <ItemSheet
          item={viewing}
          price={priceFor(viewing, day)}
          owned={owns(progress, viewing.id)}
          equipped={equipped(viewing)}
          balance={balance}
          onBuy={press}
          onUse={(item) => {
            equip(item);
            setViewing(null);
          }}
          onClose={() => setViewing(null)}
        />
      )}
      {mystery && <Reveal kind="mystery" eyebrow="Mystery box" prize={mystery} onUse={equip} onClose={() => setMystery(null)} />}
    </main>
  );
}

/** The shop's sections, scrollable sideways on a phone. */
function ShopTabs({ value, onChange }: { value: ItemKind; onChange: (v: ItemKind) => void }) {
  const active = useRef<HTMLButtonElement>(null);
  const row = useRef<HTMLDivElement>(null);
  // Centre the chosen section in the row, sideways only (never scrolling the page).
  useEffect(() => {
    const el = active.current;
    const box = row.current;
    if (!el || !box) return;
    box.scrollTo({
      left: el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }, [value]);
  return (
    <div
      ref={row}
      role="radiogroup"
      aria-label="Shop section"
      className="no-scrollbar relative -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:justify-center"
    >
      {TABS.filter((t) => t.group === GROUP_OF[value]).map((t) => {
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
  burst,
  onPress,
}: {
  item: ShopItem;
  index: number;
  price: number;
  deal: boolean;
  owned: boolean;
  equipped: boolean;
  burst: number | null;
  onPress: () => void;
}) {
  return (
    <m.li
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <button
        type="button"
        onClick={onPress}
        aria-label={`${item.name}, ${equipped ? 'in use' : owned ? 'owned' : `${price} coins`}`}
        className={`shop-card relative flex h-full w-full flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface p-3 text-left text-text transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
          equipped ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
        }`}
      >
        {deal && !owned && (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-danger px-1.5 py-px text-[0.6rem] font-bold tracking-wide text-white uppercase">
            −30%
          </span>
        )}
        <span className="mb-2.5 flex justify-center" aria-hidden>
          <ItemPreview item={item} still />
        </span>
        <span className="flex items-start justify-between gap-2">
          <span className="font-bold leading-tight">{item.name}</span>
          {item.animated && !owned && <Sparkles className="mt-0.5 size-3.5 shrink-0 text-present" aria-label="Animated" />}
        </span>
        <span className="mt-auto pt-2 text-sm font-bold">
          {equipped ? (
            <span className="inline-flex items-center gap-1 text-accent">
              <Check className="size-4" aria-hidden /> In use
            </span>
          ) : owned ? (
            <span className="text-muted">Owned</span>
          ) : (
            <span className="tabular inline-flex items-center gap-1">
              <Coin className="size-4" /> {price.toLocaleString()}
              {price !== item.price && <span className="text-xs font-semibold text-muted line-through">{item.price}</span>}
            </span>
          )}
        </span>
      </button>
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
    <section
      className="extra-card flex items-center gap-3 rounded-[var(--radius-card)] p-3.5 text-white shadow-md"
      data-tone={tone}
      aria-label={title}
    >
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-white/20 ${tone === 'mystery' && !disabled ? 'mystery-wobble' : ''}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{title}</p>
        <p className="text-[0.78rem] leading-snug text-white/85">{text}</p>
      </div>
      <button
        type="button"
        onClick={onPress}
        disabled={disabled}
        aria-label={confirming ? `Confirm buying a ${what} for ${price} coins` : `${action} for ${price} coins`}
        className="buy-button inline-flex min-h-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-white px-3 text-sm font-extrabold text-slate-900 transition hover:bg-white/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
        data-confirm={confirming || undefined}
      >
        {confirming ? (
          'Confirm'
        ) : (
          <span className="tabular inline-flex items-center gap-1">
            <Coin className="size-4" /> {price}
          </span>
        )}
      </button>
    </section>
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

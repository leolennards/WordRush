import { useRef, useState, type ReactNode } from 'react';
import { m } from 'motion/react';
import { ArrowLeft, Camera, Check, CircleCheck, Flame, ImageOff, Lock, ShoppingBag, Smile, Trophy, Type } from 'lucide-react';
import {
  ACHIEVEMENTS,
  TILE_PALS,
  palUnlocked,
  BADGES,
  BANNERS,
  FRAMES,
  PHOTO_MAX,
  SHOP_ITEMS,
  TINTS,
  TITLES,
  cosmeticUnlocked,
  effectiveStreak,
  frozenDays,
  levelFor,
  owns,
  rankFor,
} from '@/engine';
import type { Settings } from '@/lib/storage/schemas';
import { useTodayIndex } from '@/hooks/useToday';
import { useServices } from '@/app/services';
import { useFriends } from '@/features/friends/FriendsContext';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { useStats } from '@/features/stats/StatsContext';
import { useToast } from '@/components/layout/Toasts';
import { Avatar, BadgeIcon, type Look } from '@/components/friends/Avatar';
import { TilePalArt } from '@/components/friends/TilePalArt';
import { LevelRoad } from './LevelRoad';
import { RankBadge } from '@/components/progress/RankBadge';
import { LockTag } from '@/components/shop/LockTag';
import { lockLabel, titleTier } from '@/components/shop/kinds';
import { Segmented } from '@/components/ui';

/** Shrinks a picked image to a small square JPEG, small enough to share with friends. */
async function photoFromFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That file isn’t a picture we can use'));
      el.src = url;
    });
    for (const [size, quality] of [
      [128, 0.8],
      [112, 0.7],
      [96, 0.6],
      [80, 0.5],
    ] as const) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Couldn’t read the picture');
      // Centre crop to a square.
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.startsWith('data:image/jpeg') && data.length <= PHOTO_MAX) return data;
    }
    throw new Error('That picture is too detailed, try another');
  } finally {
    URL.revokeObjectURL(url);
  }
}

type PictureMode = 'initial' | 'pal' | 'photo';

/** Your profile: picture, colour, frame, badge, title and banner, as friends see them. */
export function ProfileScreen({ onBack, onShop }: { onBack: () => void; onShop: () => void }) {
  const { settings, update } = useSettings();
  const { progress } = useProgress();
  const stats = useStats();
  const f = useFriends();
  const { now } = useServices();
  const { toast } = useToast();
  const today = useTodayIndex(now);
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const mode: PictureMode = settings.avatar === 'photo' ? 'photo' : settings.avatar === 'initial' ? 'initial' : 'pal';
  const [tab, setTab] = useState<PictureMode>(mode);

  const name = f.me?.profile.name ?? 'You';
  const { level } = levelFor(progress.xp);
  const { rank } = rankFor(level);
  const streak = effectiveStreak(stats.daily, today, frozenDays(progress.owned));
  const achievements = ACHIEVEMENTS.filter((a) => progress.unlocked[a.id]).length;
  const collected = SHOP_ITEMS.filter((i) => owns(progress, i.id)).length;
  const look: Look = f.lookOf('me');
  const title = TITLES.find((t) => t.id === settings.title && t.id !== 'none');

  const pickPhoto = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    try {
      const photo = await photoFromFile(picked);
      update({ avatar: 'photo', photo });
      toast('Looking good! Your new picture is on', { tone: 'success' });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Couldn’t use that picture');
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  };

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
          <h2 className="flex-1 text-[1.05rem] leading-tight font-bold tracking-tight">Your profile</h2>
          <button
            type="button"
            onClick={onShop}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-3 active:scale-95"
          >
            <ShoppingBag className="size-4" aria-hidden /> Shop
          </button>
        </div>

        {/* The card friends see. */}
        <m.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-md"
          aria-label="Your profile card"
        >
          <div className="profile-banner relative h-28" data-banner={settings.banner}>
            <div className="absolute top-3 right-3">
              <RankBadge level={level} rank={rank} size="sm" />
            </div>
          </div>
          <div className="relative px-5 pb-5">
            <div className="-mt-12 flex items-end gap-3">
              <m.div key={`${settings.avatar}${settings.tint}${settings.frame}`} initial={{ scale: 0.85 }} animate={{ scale: 1 }}>
                <span className="inline-block rounded-full bg-surface p-1">
                  <Avatar uid={f.me?.uid ?? 'me'} name={name} size="xl" look={look} />
                </span>
              </m.div>
            </div>
            <p className="mt-2 text-xl font-extrabold">{name}</p>
            {title && (
              <p className="profile-title text-sm font-bold" data-tier={titleTier(title)}>
                {title.name}
              </p>
            )}
            <p className="text-xs text-muted">
              Level {level} · {rank.name}
            </p>
            <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
              <Stat icon={<Flame className="size-4 text-present" aria-hidden />} label="Streak" value={streak} />
              <Stat icon={<Trophy className="size-4 text-accent" aria-hidden />} label="Awards" value={achievements} />
              <Stat icon={<ShoppingBag className="size-4 text-pink-500" aria-hidden />} label="Collected" value={collected} />
              <Stat icon={<CircleCheck className="size-4 text-correct" aria-hidden />} label="Wins" value={progress.wins} />
            </dl>
            {!f.me && (
              <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-muted">
                Friends see this card once you create a Friends profile (on the Friends page), where you also pick your name.
              </p>
            )}
          </div>
        </m.section>

        <Section title={`Level rewards · you're level ${level}`}>
          <p className="mb-2 text-sm text-muted">Every few levels unlocks something new. The higher you climb, the cooler it gets.</p>
          <LevelRoad level={level} />
        </Section>

        {/* Picture */}
        <Section title="Picture">
          <Segmented<PictureMode>
            label="Picture type"
            size="sm"
            value={tab}
            onChange={(v) => {
              setTab(v);
              if (v === 'initial') update({ avatar: 'initial' });
              if (v === 'photo' && settings.photo) update({ avatar: 'photo' });
            }}
            options={[
              {
                value: 'initial',
                label: (
                  <>
                    <Type className="size-3.5" aria-hidden /> Initial
                  </>
                ),
              },
              {
                value: 'pal',
                label: (
                  <>
                    <Smile className="size-3.5" aria-hidden /> Tile Pals
                  </>
                ),
              },
              {
                value: 'photo',
                label: (
                  <>
                    <Camera className="size-3.5" aria-hidden /> Photo
                  </>
                ),
              },
            ]}
          />
          {tab === 'pal' && (
            <div role="radiogroup" aria-label="Tile Pals" className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {TILE_PALS.map((p) => {
                const on = settings.avatar === p.id;
                const open = palUnlocked(p.id, level);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={open ? p.name : `${p.name}, unlocks at level ${p.level}`}
                    disabled={!open}
                    onClick={() => update({ avatar: p.id })}
                    className={`group relative flex flex-col items-center gap-1 rounded-xl p-2 transition active:scale-95 disabled:cursor-not-allowed ${
                      on ? 'bg-accent/15 ring-2 ring-accent' : 'bg-surface-2 hover:bg-surface-3'
                    }`}
                  >
                    <span className={`block size-12 transition-transform group-hover:scale-110 group-hover:-rotate-6 ${open ? '' : 'opacity-35 grayscale'}`}>
                      <TilePalArt pal={p} />
                    </span>
                    <span className={`text-[0.7rem] leading-tight font-semibold ${open ? '' : 'text-muted'}`}>{p.name}</span>
                    {!open && (
                      <span className="tabular flex items-center gap-0.5 text-[0.6rem] text-subtle">
                        <Lock className="size-2.5" aria-hidden /> Level {p.level}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {tab === 'photo' && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                ref={file}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => void pickPhoto(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => file.current?.click()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-accent-ink transition active:scale-[0.97] disabled:opacity-60"
              >
                <Camera className="size-4" aria-hidden /> {settings.photo ? 'Choose another photo' : 'Choose a photo'}
              </button>
              {settings.photo && (
                <button
                  type="button"
                  onClick={() => {
                    update({ avatar: 'initial', photo: '' });
                    setTab('initial');
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-surface-2 px-4 text-sm font-semibold transition hover:bg-surface-3"
                >
                  <ImageOff className="size-4" aria-hidden /> Remove photo
                </button>
              )}
              <p className="w-full text-xs text-muted">
                It’s cropped to a small square and only your friends can see it. Please pick something you’re happy for them to
                see.
              </p>
            </div>
          )}
        </Section>

        {/* Colour behind the picture */}
        <Section title="Colour">
          <div role="radiogroup" aria-label="Picture colour" className="flex flex-wrap gap-2">
            {TINTS.map((t) => {
              const on = settings.tint === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={t.name}
                  title={t.name}
                  onClick={() => update({ tint: t.id })}
                  className={`grid size-10 place-items-center rounded-full border-2 transition hover:scale-110 active:scale-95 ${
                    on ? 'border-text' : 'border-transparent'
                  }`}
                  style={{
                    background: t.css || 'conic-gradient(#22a467, #0ea5e9, #7c3aed, #e0457b, #22a467)',
                  }}
                >
                  {t.id === 'auto' && <span className="text-[0.6rem] font-black text-white">AUTO</span>}
                  {on && t.id !== 'auto' && <Check className="size-4 text-white" aria-hidden />}
                </button>
              );
            })}
          </div>
        </Section>

        <Picks
          title="Frame"
          kind="frame"
          setting="frame"
          items={FRAMES}
          onShop={onShop}
          preview={(id) => <Avatar uid={f.me?.uid ?? 'me'} name={name} size="md" look={{ ...look, frame: id, badge: null }} />}
        />
        <Picks
          title="Badge"
          kind="badge"
          setting="badge"
          items={BADGES}
          onShop={onShop}
          preview={(id) =>
            id === 'none' ? (
              <span className="size-6 rounded-full border-2 border-dashed border-border-strong" />
            ) : (
              <BadgeIcon id={id} className="size-7" />
            )
          }
        />
        <Picks
          title="Title"
          kind="title"
          setting="title"
          items={TITLES}
          onShop={onShop}
          wide
          preview={(id, n) => (
            <span
              className={`text-sm font-bold ${id === 'none' ? 'text-muted' : 'profile-title'}`}
              data-tier={titleTier(TITLES.find((t) => t.id === id))}
            >
              {n}
            </span>
          )}
        />
        <Picks
          title="Banner"
          kind="banner"
          setting="banner"
          items={BANNERS}
          onShop={onShop}
          wide
          preview={(id) => <span className="profile-banner block h-10 w-full rounded-lg" data-banner={id} />}
        />
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-2 py-2">
      <dd className="tabular flex items-center justify-center gap-1 text-lg font-extrabold">
        {icon}
        {value}
      </dd>
      <dt className="text-[0.7rem] text-muted">{label}</dt>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6" aria-label={title}>
      <h3 className="mb-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** Pick one of the frames, badges, titles or banners: owned ones to use, the rest with a price. */
function Picks({
  title,
  kind,
  setting,
  items,
  preview,
  onShop,
  wide = false,
}: {
  title: string;
  kind: 'frame' | 'badge' | 'title' | 'banner';
  setting: 'frame' | 'badge' | 'title' | 'banner';
  items: readonly { id: string; name: string; price?: number; level?: number }[];
  preview: (id: string, name: string) => ReactNode;
  onShop: () => void;
  wide?: boolean;
}) {
  const { settings, update } = useSettings();
  const { progress } = useProgress();
  return (
    <Section title={title}>
      <div
        role="radiogroup"
        aria-label={title}
        className={`grid gap-2 ${wide ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-4 sm:grid-cols-6'}`}
      >
        {items.map((it) => {
          const unlocked = cosmeticUnlocked(kind, it.id, progress.owned, levelFor(progress.xp).level);
          const on = settings[setting] === it.id;
          return (
            <button
              key={it.id}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={unlocked ? it.name : `${it.name}, ${lockLabel(it)}`}
              onClick={() => (unlocked ? update({ [setting]: it.id } as Partial<Settings>) : it.level === undefined && onShop())}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition active:scale-[0.97] ${
                on ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
              }`}
            >
              <span className={`grid min-h-11 w-full place-items-center ${unlocked ? '' : 'opacity-40 grayscale'}`} aria-hidden>
                {preview(it.id, it.name)}
              </span>
              {!(wide && kind === 'title') && (
                <span className={`text-center text-xs leading-tight font-semibold ${unlocked ? '' : 'text-muted'}`}>
                  {it.name}
                </span>
              )}
              {on && (
                <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-accent text-accent-ink">
                  <Check className="size-3" aria-hidden />
                </span>
              )}
              {!unlocked && <LockTag price={it.price} level={it.level} />}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

import { useRef, useState, type ReactNode } from 'react';
import { m } from 'motion/react';
import { ArrowLeft, Camera, Check, CircleCheck, Flame, ImageOff, Lock, Trophy, Type } from 'lucide-react';
import { ACHIEVEMENTS, PHOTO_MAX, TINTS, TITLES, cosmeticUnlocked, effectiveStreak, frozenDays, levelFor, rankFor } from '@/engine';
import { useTodayIndex } from '@/hooks/useToday';
import { useServices } from '@/app/services';
import { useFriends } from '@/features/friends/FriendsContext';
import { useProgress } from '@/features/progress/ProgressContext';
import { useSettings } from '@/features/settings/SettingsContext';
import { useStats } from '@/features/stats/StatsContext';
import { useToast } from '@/components/layout/Toasts';
import { Avatar, type Look } from '@/components/friends/Avatar';
import { LevelRoad } from './LevelRoad';
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

type PictureMode = 'initial' | 'photo';

/** Your profile: picture, its colour and your title, as friends see them, plus your level rewards. */
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
  const [tab, setTab] = useState<PictureMode>(settings.avatar);
  const [info, setInfo] = useState<{ text: string; shop: boolean } | null>(null);

  const name = f.me?.profile.name ?? 'You';
  const { level } = levelFor(progress.xp);
  const { rank } = rankFor(level);
  const streak = effectiveStreak(stats.daily, today, frozenDays(progress.owned));
  const achievements = ACHIEVEMENTS.filter((a) => progress.unlocked[a.id]).length;
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
      <div className="mx-auto w-full max-w-[36rem] px-4 pt-3 pb-10 sm:pt-5">
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
        </div>

        {/* The card friends see. */}
        <m.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-sm"
          aria-label="Your profile card"
        >
          <div className="flex items-center gap-4">
            <m.div key={`${settings.avatar}${settings.tint}`} initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <Avatar uid={f.me?.uid ?? 'me'} name={name} size="xl" look={look} />
            </m.div>
            <div className="min-w-0">
              <p className="truncate text-xl font-extrabold">{name}</p>
              {title && (
                <p className="profile-title truncate text-sm font-bold" data-tier={titleTier(title)}>
                  {title.name}
                </p>
              )}
              <p className="text-sm text-muted">
                Level {level} · {rank.name}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat icon={<Flame className="size-4 text-present" aria-hidden />} label="Streak" value={streak} />
            <Stat icon={<CircleCheck className="size-4 text-correct" aria-hidden />} label="Wins" value={progress.wins} />
            <Stat icon={<Trophy className="size-4 text-accent" aria-hidden />} label="Awards" value={achievements} />
          </dl>
          {!f.me && (
            <p className="mt-4 text-xs text-muted">Friends see this card once you set up Friends, where you also pick your name.</p>
          )}
        </m.section>

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
                value: 'photo',
                label: (
                  <>
                    <Camera className="size-3.5" aria-hidden /> Photo
                  </>
                ),
              },
            ]}
          />
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
          {tab === 'initial' && (
            <div role="radiogroup" aria-label="Picture colour" className="mt-3 grid max-w-[24rem] grid-cols-8 gap-2">
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
                    className={`grid aspect-square w-full place-items-center rounded-full border-2 transition hover:scale-110 active:scale-95 ${
                      on ? 'border-text' : 'border-transparent'
                    }`}
                    style={{
                      background: t.css || 'conic-gradient(#22a467, #0ea5e9, #7c3aed, #e0457b, #22a467)',
                    }}
                  >
                    {t.id === 'auto' && <span className="text-[0.55rem] font-black text-white">AUTO</span>}
                    {on && t.id !== 'auto' && <Check className="size-4 text-white" aria-hidden />}
                  </button>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Title">
          {info && (
            <div role="status" className="mb-3 flex items-center gap-3 rounded-xl bg-present/15 px-3 py-2.5 text-sm">
              <Lock className="size-4 shrink-0 text-present" aria-hidden />
              <span className="min-w-0 flex-1">{info.text}</span>
              {info.shop && (
                <button
                  type="button"
                  onClick={onShop}
                  className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-bold transition hover:bg-surface-3"
                >
                  Shop
                </button>
              )}
            </div>
          )}
          <TitlePicks onLocked={setInfo} />
        </Section>

        <Section title={`Level rewards · you're level ${level}`}>
          <LevelRoad level={level} />
        </Section>
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

/** Pick a title: unlocked ones to use, the rest with how to get them. */
function TitlePicks({ onLocked }: { onLocked: (info: { text: string; shop: boolean }) => void }) {
  const { settings, update } = useSettings();
  const { progress } = useProgress();
  const level = levelFor(progress.xp).level;
  return (
    <div role="radiogroup" aria-label="Title" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {TITLES.map((it) => {
        const unlocked = cosmeticUnlocked('title', it.id, progress.owned, level);
        const on = settings.title === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={unlocked ? it.name : `${it.name}, ${lockLabel(it)}`}
            onClick={() =>
              unlocked
                ? update({ title: it.id })
                : onLocked(
                    it.level !== undefined
                      ? { text: `${it.name} unlocks at level ${it.level}.`, shop: false }
                      : { text: `${it.name} is ${it.price} coins in the shop.`, shop: true },
                  )
            }
            className={`relative grid min-h-12 place-items-center rounded-xl border px-2 py-2.5 transition active:scale-[0.97] ${
              on ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-border-strong'
            }`}
          >
            <span
              className={`text-center text-sm leading-tight font-bold ${it.id === 'none' ? 'text-muted' : 'profile-title'} ${unlocked ? '' : 'opacity-40'}`}
              data-tier={titleTier(it)}
            >
              {it.name}
            </span>
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
  );
}

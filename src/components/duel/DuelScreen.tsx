import { useCallback } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ArrowLeft, Bot, House, RotateCcw, Swords, Users } from 'lucide-react';
import { BOTS, type BotLevel, type GameState } from '@/engine';
import { useDuel, type BotBoard } from '@/features/duel/useDuel';
import { useGameScreen } from '@/features/game/useGameScreen';
import { useAward } from '@/features/progress/useAward';
import { useProgress } from '@/features/progress/ProgressContext';
import { PlayArea } from '@/components/board/PlayArea';
import { MiniBoard } from '@/components/home/MiniBoard';
import { WordChip } from '@/components/words/WordChip';
import { BoardOverlay, Button } from '@/components/ui';

const BOT_COLOURS: Record<BotLevel, { tile: string; ring: string }> = {
  easy: { tile: 'bg-correct/20 text-correct', ring: 'ring-correct/40' },
  medium: { tile: 'bg-present/25 text-present', ring: 'ring-present/40' },
  hard: { tile: 'bg-danger/15 text-danger', ring: 'ring-danger/40' },
};

interface DuelScreenProps {
  avoidAnswer: string;
  inputEnabled: boolean;
  onHome: () => void;
}

/** Race a bot to the same word. */
export function DuelScreen({ avoidAnswer, inputEnabled, onHome }: DuelScreenProps) {
  const award = useAward();
  const { progress, gains } = useProgress();

  const onEnd = useCallback(
    (r: { won: boolean; guesses: number; level: BotLevel; id: string; answer: string }) =>
      award({
        id: r.id,
        mode: 'duel',
        won: r.won,
        guesses: r.guesses,
        hardMode: false,
        hints: 0,
        seconds: null,
        bot: r.level,
        words: [{ answer: r.answer, won: r.won }],
      }),
    [award],
  );

  const duel = useDuel(avoidAnswer, onEnd);
  const { phase, bot, level, winner } = duel;
  const { game } = duel.session;
  const profile = BOTS[level];
  const screen = useGameScreen(duel, { inputEnabled: inputEnabled && phase === 'playing', lossToast: null });

  let overlay = null;
  if (phase === 'pick') {
    overlay = (
      <BoardOverlay>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-ink text-ink-text">
          <Swords className="size-6" aria-hidden />
        </span>
        <p className="mt-3 text-lg font-extrabold">Bot Duel</p>
        <p className="mt-1 text-sm text-muted">Race a bot to the same word. First to solve it wins.</p>
        <div className="mt-4 grid gap-2 text-left">
          {(Object.keys(BOTS) as BotLevel[]).map((lvl, i) => (
            <button
              key={lvl}
              type="button"
              onClick={() => duel.start(lvl)}
              autoFocus={i === 1}
              className="group flex items-center gap-3 rounded-xl border border-border p-2.5 transition hover:border-border-strong hover:bg-surface-2 active:scale-[0.99]"
              aria-label={`Duel ${BOTS[lvl].name}, ${lvl}`}
            >
              <BotAvatar level={lvl} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-bold">
                  {BOTS[lvl].name}
                  <span className="flex gap-0.5" aria-hidden>
                    {[0, 1, 2].map((p) => (
                      <span
                        key={p}
                        className={`size-1.5 rounded-full ${p <= i ? 'bg-text' : 'bg-border-strong'}`}
                      />
                    ))}
                  </span>
                </span>
                <span className="block text-xs text-muted">{BOTS[lvl].tagline}</span>
              </span>
            </button>
          ))}
        </div>
        {progress.duelWins > 0 && (
          <p className="tabular mt-3 text-xs text-muted">
            You’ve beaten the bots {progress.duelWins} {progress.duelWins === 1 ? 'time' : 'times'}.
          </p>
        )}
      </BoardOverlay>
    );
  } else if (phase === 'countdown') {
    const n = Math.max(1, Math.ceil(duel.countdown / 1000));
    overlay = (
      <BoardOverlay transparent>
        <AnimatePresence mode="popLayout">
          <m.p
            key={n}
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="tabular text-7xl font-extrabold"
            aria-live="assertive"
          >
            {n}
          </m.p>
        </AnimatePresence>
        <p className="mt-2 text-sm font-semibold text-muted">vs {profile.name}</p>
      </BoardOverlay>
    );
  }

  return (
    <main id="game" className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-3 pt-3 pb-1 sm:pt-5">
        <button
          type="button"
          onClick={onHome}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.05rem] leading-tight font-bold tracking-tight">Bot Duel</h2>
          <p className="truncate text-xs text-muted">{phase === 'pick' ? 'Choose your opponent' : `vs ${profile.name}`}</p>
        </div>
      </div>

      <PlayArea
        active={duel}
        screen={screen}
        celebrationSeed={game.guesses.length + 11}
        keyboardDisabled={phase !== 'playing'}
        forceEnd={phase === 'over'}
        overlay={overlay}
        top={phase !== 'pick' ? <OpponentStrip level={level} bot={bot} thinking={phase === 'playing' && bot.status === 'playing'} /> : null}
        endPanel={
          phase === 'over' ? (
            <DuelResult
              game={game}
              bot={bot}
              level={level}
              winner={winner}
              xp={gains[game.id]}
              onRematch={() => duel.start(level)}
              onPick={duel.pickAgain}
              onHome={onHome}
            />
          ) : null
        }
      />
    </main>
  );
}

function BotAvatar({ level, thinking = false }: { level: BotLevel; thinking?: boolean }) {
  return (
    <span className={`relative grid size-10 shrink-0 place-items-center rounded-xl ${BOT_COLOURS[level].tile}`}>
      <Bot className={`size-5 ${thinking ? 'bot-think' : ''}`} aria-hidden />
    </span>
  );
}

function OpponentStrip({ level, bot, thinking }: { level: BotLevel; bot: BotBoard; thinking: boolean }) {
  const board: GameState = {
    mode: 'duel',
    id: 'bot',
    answer: 'xxxxx',
    guesses: bot.guesses,
    evaluations: bot.evaluations,
    status: bot.status,
    hardMode: false,
    dayIndex: null,
  };
  return (
    <div className="mx-auto flex w-full max-w-[26rem] items-center gap-3 px-3 pt-1" aria-label={`${BOTS[level].name}'s progress`} role="group">
      <BotAvatar level={level} thinking={thinking} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          {BOTS[level].name}
          {thinking && (
            <span className="typing-dots" aria-label="thinking">
              <i />
              <i />
              <i />
            </span>
          )}
        </p>
        <AnimatePresence mode="wait">
          <m.p
            key={bot.line}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="truncate text-xs text-muted italic"
            aria-live="polite"
          >
            “{bot.line}”
          </m.p>
        </AnimatePresence>
      </div>
      <MiniBoard game={board} tile="size-2.5 rounded-[2px]" className="shrink-0" />
    </div>
  );
}

function DuelResult({
  game,
  bot,
  level,
  winner,
  xp,
  onRematch,
  onPick,
  onHome,
}: {
  game: GameState;
  bot: BotBoard;
  level: BotLevel;
  winner: 'you' | 'bot' | 'nobody' | null;
  xp?: number;
  onRematch: () => void;
  onPick: () => void;
  onHome: () => void;
}) {
  const name = BOTS[level].name;
  const headline = winner === 'you' ? `You beat ${name}!` : winner === 'bot' ? `${name} got there first.` : 'Nobody solved it.';
  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[30rem] px-3"
      role="region"
      aria-label="Duel result"
    >
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-bold">
              {headline}
              {xp ? (
                <span className="tabular rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">+{xp} XP</span>
              ) : null}
            </p>
            <p className="text-xs text-muted">
              You: {game.status === 'won' ? `${game.guesses.length} guesses` : game.status === 'lost' ? 'not solved' : 'unfinished'} ·{' '}
              {name}: {bot.status === 'won' ? `${bot.guesses.length} guesses` : bot.status === 'lost' ? 'not solved' : 'unfinished'}
            </p>
          </div>
          <WordChip word={game.answer} won={game.status === 'won'} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={onHome} className="flex-1 px-2">
            <House className="size-4" aria-hidden /> Home
          </Button>
          <Button onClick={onPick} className="flex-1 px-2">
            <Users className="size-4" aria-hidden /> Change bot
          </Button>
          <Button variant="primary" onClick={onRematch} className="flex-1 px-2">
            <RotateCcw className="size-4" aria-hidden /> Rematch
          </Button>
        </div>
      </div>
    </m.div>
  );
}

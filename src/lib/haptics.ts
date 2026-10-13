/**
 * Short vibrations via the Vibration API (Android browsers and the Android
 * app). Silently does nothing where unsupported, e.g. iOS Safari.
 */
type Pattern = 'key' | 'invalid' | 'win' | 'lose' | 'hint';

const PATTERNS: Record<Pattern, number | number[]> = {
  key: 8,
  invalid: [30, 40, 30],
  win: [20, 50, 20, 50, 60],
  lose: [80],
  hint: [12, 30, 12],
};

export const hapticsSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export function buzz(pattern: Pattern): void {
  if (!hapticsSupported()) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* ignore: some browsers throw without a user gesture */
  }
}

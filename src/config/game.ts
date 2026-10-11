/**
 * Central branding and game configuration. Change values here rather than
 * hard-coding them in components.
 */
export const BRAND = {
  name: 'Wordskiis',
  /** The name split for the two-tone wordmark. */
  wordmark: ['Word', 'skiis'] as const,
  tagline: 'A little word challenge every day.',
  /**
   * Public URL used in shared results. Set VITE_SITE_URL at build time for
   * production; otherwise the current page origin is used at runtime.
   */
  siteUrl: (import.meta.env.VITE_SITE_URL as string | undefined) ?? '',
} as const;

export const GAME = {
  wordLength: 5,
  maxGuesses: 6,
  /**
   * The first daily challenge (#1) is played on this UTC date.
   * Changing it renumbers and reschedules every daily challenge.
   */
  dailyEpoch: '2026-10-11',
  /**
   * Identifies the answer list + schedule. Players on the same version get the
   * same daily answer for the same UTC date.
   */
  dictionaryVersion: 1,
  /** Practice games avoid repeating any of the last N answers. */
  practiceRecentLimit: 100,
} as const;

/** Animation timings in milliseconds (keep in sync with tokens in index.css). */
export const TIMING = {
  flipStagger: 260,
  flipDuration: 480,
  shake: 450,
  /** Delay after the reveal finishes before opening the results dialog. */
  resultDelay: 900,
  toast: 1800,
} as const;

export const STORAGE_PREFIX = 'wordskiis';

# Changelog

## 1.0.0 — 2026-10-11

Initial release.

- Project setup: React 19, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, Motion, Lucide, Vitest,
  React Testing Library, Playwright, ESLint.
- Pure game engine: frequency-aware evaluation, guess validation, hard mode, daily scheduling,
  statistics, practice selection and share text.
- Local dictionary: 1,922 curated answers and 12,675 accepted guesses from SCOWL and `word-list`,
  with a reproducible generator.
- Daily Challenge (UTC, numbered, countdown, restore, rollover handling) and Practice mode with
  separate storage and statistics.
- Versioned, validated localStorage persistence with memory fallback.
- Responsive board and keyboard, physical and on-screen input, reveal, shake, bounce and win
  animations.
- Results, statistics, settings, help and confirmation dialogs.
- Spoiler-free sharing via the Web Share API or clipboard.
- Dark, light and system themes without flash; colour-accessible palette with shape markers;
  reduced motion; optional synthesised sounds.
- Accessibility: semantic landmarks, labelled tiles and keys, live announcements, focus trapping
  and restore in dialogs, skip link.
- PWA manifest, icons and offline service worker.
- 73 unit/interface tests and 10 Playwright end-to-end tests.

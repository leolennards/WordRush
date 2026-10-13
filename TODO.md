# TODO

## Verification still needed

- [ ] Manual testing on real iOS Safari and Android Chrome devices (safe areas, Web Share sheet,
      virtual keyboard never appearing, audio after first tap).
- [ ] Run the Playwright suite against Firefox and WebKit (`npx playwright install firefox webkit`
      and add projects to `playwright.config.ts`); only Chromium has been tested.
- [ ] Screen-reader pass with VoiceOver and NVDA (announcements, dialog focus, grid semantics).
- [ ] Lighthouse/axe audit of the deployed build, including colour-contrast measurements.
- [ ] Verify offline behaviour and PWA installation on a deployed HTTPS origin.

## Product improvements

- [ ] Second manual review of the answer list for obscure words.
- [ ] Optional simple puzzle calendar or archive of past daily challenges.
- [ ] Code-split dialogs and lazily load the accepted-guess list to reduce the initial bundle.
- [ ] Service worker update prompt ("A new version is available").
- [x] A small number of achievements (only if they stay non-manipulative).
- [ ] Optional export/import of statistics to move between devices.

## Mobile

- [ ] Capacitor wrapper with native storage and share (see ARCHITECTURE.md → Future mobile path).

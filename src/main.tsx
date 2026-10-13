import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import { App } from '@/app/App';
import { dictionary } from '@/data/words';
import { createBrowserStore } from '@/lib/storage/store';
import { trackChanges } from '@/lib/storage/tracked';
import { KEYS, SYNCED_KEYS } from '@/lib/storage/schemas';
import { registerServiceWorker } from '@/lib/pwa/registerServiceWorker';
import { defineWord } from '@/lib/dictionary/define';

const services = {
  // Remembers when synced game saves change, for cloud save's "newest wins".
  store: trackChanges(createBrowserStore(), SYNCED_KEYS, KEYS.syncStamps, () => Date.now()),
  dictionary,
  now: () => new Date(),
  random: Math.random,
  define: defineWord,
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
);

registerServiceWorker();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/index.css';
import { App } from '@/app/App';
import { dictionary } from '@/data/words';
import { createBrowserStore } from '@/lib/storage/store';
import { registerServiceWorker } from '@/lib/pwa/registerServiceWorker';
import { defineWord } from '@/lib/dictionary/define';

const services = {
  store: createBrowserStore(),
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

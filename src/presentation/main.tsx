import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// L4 Presentation のエントリ（B4 V-01 / EP-14 の受け皿）。
// ⚠️ この層は L2 Simulation を import してはならない（憲章 I-1 / eslint で強制）。
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

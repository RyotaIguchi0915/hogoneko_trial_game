import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { bootstrap } from './bootstrap';
import { createLocalStorageSaveStorage } from './localStorageStorage';

/**
 * Entry — ブラウザ固有依存を注入し、静かなシーンを描く（EP-14）。
 *
 * 5層貫通の合成は Core（GameRuntime）へ、起動配線は bootstrap() へ委譲する。
 * この層が担うのは「ブラウザ依存の注入」と「React 描画」だけ。
 *
 * ⚠️ この層は L2 Simulation を import しない（憲章 I-1 / eslint で強制）。
 * ⚠️ 決定論の要（シード・時刻）はここで注入する。Core は Date を直接使わない（AD-38）。
 */

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('root element not found');
}

// 新規プレイスルーのシードは L4 で一度だけ選び、以後はセーブから復元される（B4 §9.2）。
const { runtime, view } = bootstrap({
  storage: createLocalStorageSaveStorage(),
  clock: () => Date.now(),
  seed: Date.now() >>> 0,
  buildVersion: '0.1.0',
});

// ページ離脱時の緊急保存（B4 §9.4）。
window.addEventListener('beforeunload', () => {
  runtime.save();
});

// 開発ビルド限定: 真実インスペクタを起動（B4 §11.5 / EP-12）。
// ⚠️ import.meta.env.DEV は本番ビルドで false に置換され、この動的 import ごと除去される。
//    → 本番バンドルに devtools（真実の可視化経路）は一切含まれない。
if (import.meta.env.DEV) {
  void import('../devtools/TruthInspector').then(({ mountTruthInspector }) => {
    mountTruthInspector(runtime.createTruthReader());
  });
}

createRoot(rootElement).render(
  <StrictMode>
    <App view={view} />
  </StrictMode>,
);

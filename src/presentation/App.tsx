import { useState } from 'react';
import type { RestoreStatus } from '@core/index';
import type { GameRuntime } from '@app/index';
import { Scene } from './Scene';
import { computeView } from './bootstrap';
import type { AppView } from './appView';

/**
 * App — L4 Presentation のルート（EP-14 / EP-2.10 描画 / EP-2.08 介入）。
 *
 * Canvas シーン（Scene）＋観察キャプション＋最小の操作（次へ / 餌をやる）を静かに提示する。
 * ⚠️ 操作 UI は**プレースホルダ**（レイアウト・見た目・操作系の本設計は OI-4 = 人間ドメイン）。
 * ⚠️ この層は Cat State（真実）を受け取らない。受け取るのは Phenomenon 由来の文字列・進行・行動枠のみ（憲章 I-1）。
 * ⚠️ トーンは静か（Pillar 6）。達成演出・焦燥演出を持たない。
 */
export type { AppView } from './appView';

/** 復元経路の静かな言い換え（憲章§10.2・§11.4 の語彙）。 */
function restoreNote(status: RestoreStatus): string {
  switch (status) {
    case 'ok':
      return '前回の続きから';
    case 'recovered':
      return '記録の一部を読み直しました';
    case 'empty':
      return 'はじめから';
    case 'unrecoverable':
      return 'うまく読み込めませんでした';
  }
}

const buttonStyle = {
  fontFamily: 'inherit',
  fontSize: '0.85rem',
  padding: '0.4rem 1rem',
  border: '1px solid #c9c4bc',
  borderRadius: '4px',
  background: '#fff',
  color: '#4a4a4a',
  cursor: 'pointer',
} as const;

export function App({ runtime, initialView }: { runtime: GameRuntime; initialView: AppView }) {
  const [view, setView] = useState<AppView>(initialView);

  const refresh = () => setView(computeView(runtime, initialView.restoreStatus));
  const onAdvance = () => {
    runtime.advanceSegment();
    runtime.save();
    refresh();
  };
  const onFeed = () => {
    runtime.feed();
    runtime.save(); // 介入は永続状態（空腹）を変える → チェックポイント保存（B4 §9.4）
    refresh();
  };

  const ended = view.phase === 'ended';

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        color: '#4a4a4a',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', lineHeight: 2, maxWidth: '28rem', padding: '0 1rem' }}>
        {/* Canvas シーン（装飾・ADR-001）。本番アート/レイアウトは OI-6/OI-4。 */}
        <Scene view={view} />

        {/* 観測された猫の様子（見えた事実のみ）。canvas の a11y 代替も兼ねる。構図固定・変わるのは言葉だけ（B3 ③） */}
        {view.observations.length > 0 ? (
          <div aria-label="観察" style={{ margin: 0 }}>
            {view.observations.map((text, i) => (
              <p key={i} style={{ fontSize: '1.15rem', margin: 0 }}>
                {text}
              </p>
            ))}
          </div>
        ) : (
          <p aria-label="準備中" style={{ fontSize: '1.5rem', margin: 0 }}>
            …
          </p>
        )}

        <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0.75rem 0 0' }}>
          {ended
            ? `${view.day}日目・おわり`
            : `${view.day}日目 ・ ${view.segment + 1}/${view.segmentsPerDay}`}
        </p>
        <p style={{ fontSize: '0.7rem', opacity: 0.4, margin: 0 }}>
          {restoreNote(view.restoreStatus)}
        </p>

        {/* 操作（プレースホルダ UI・OI-4）。観察は無制限・介入は有限（B2 §4）。 */}
        <div
          style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}
        >
          <button
            type="button"
            style={{ ...buttonStyle, opacity: view.actionSlots <= 0 ? 0.4 : 1 }}
            onClick={onFeed}
            disabled={view.actionSlots <= 0}
            aria-label={`餌をやる（残り${view.actionSlots}）`}
          >
            餌をやる（{view.actionSlots}）
          </button>
          <button
            type="button"
            style={{ ...buttonStyle, opacity: ended ? 0.4 : 1 }}
            onClick={onAdvance}
            disabled={ended}
          >
            次へ
          </button>
        </div>
      </div>
    </main>
  );
}

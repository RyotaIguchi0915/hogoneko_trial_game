import type { RestoreStatus, TrialPhase } from '@core/index';

/**
 * App — L4 Presentation のルート（EP-14 骨格）。
 *
 * 現時点では基盤検証のための静かなプレースホルダ。
 * ゲームプレイ（タイトル・部屋・猫）は Sprint 2 以降。
 *
 * トーン方針（Pillar 6 / 憲章§9.6）に従い、派手な要素を持たない。
 * ⚠️ この層は Cat State（真実）を受け取らない。表示するのは全体進行のみ（憲章 I-1）。
 */
export interface AppView {
  readonly restoreStatus: RestoreStatus;
  readonly day: number;
  readonly segment: number;
  readonly segmentsPerDay: number;
  readonly phase: TrialPhase;
  /** 観測された現象の表示テキスト（Phenomenon をローカライズ済み・数値なし・EP-2.10）。 */
  readonly observations: readonly string[];
}

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

export function App({ view }: { view: AppView }) {
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
        {/* 観測された猫の様子（見えた事実のみ）。構図は固定し、変わるのはこの言葉だけ（B3 ③） */}
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
        <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '1rem 0 0' }}>
          {view.phase === 'ended'
            ? `${view.day}日目・おわり`
            : `${view.day}日目 ・ ${view.segment + 1}/${view.segmentsPerDay}`}
        </p>
        <p style={{ fontSize: '0.7rem', opacity: 0.4, margin: 0 }}>
          {restoreNote(view.restoreStatus)}
        </p>
      </div>
    </main>
  );
}

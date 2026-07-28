import { useState } from 'react';
import type { RestoreStatus, GamePhase } from '@core/index';
import type { GameRuntime } from '@app/index';
import { Scene } from './Scene';
import { computeView } from './bootstrap';
import type { AppView } from './appView';

/**
 * App — L4 Presentation のルート（EP-14 / EP-2.10 描画 / EP-2.08 介入 / EP-3.04 トーン「やさしい観察画」）。
 *
 * Canvas シーン（Scene）＋観察キャプション＋最小の操作（次へ / 餌をやる）をやさしく提示する。
 * ⚠️ トーンは OI-4「やさしい観察画」（ポップで優しく静か）。まるい形・温かい色・ハチミツ色の差し色。
 *    レイアウトの本設計・本番アート（猫の絵）・結末の中身は監修（docs/17 参照）。ダーク対応は後続。
 * ⚠️ この層は Cat State（真実）を受け取らない。受け取るのは Phenomenon 由来の文字列・進行・行動枠のみ（憲章 I-1）。
 * ⚠️ 達成演出・焦燥演出を持たない（Pillar 6）。数値は「観測回数」等の Player 側のみ（内部状態は出さない）。
 */
export type { AppView } from './appView';

/** 「やさしい観察画」トークン（docs/17・OI-4）。温かいクリーム＋ハチミツの差し色＋添えのセージ。 */
const T = {
  ground: '#f7efe0',
  surface: '#fffdf7',
  surface2: '#f4ecdd',
  ink: '#5d4c3f',
  ink2: '#93806e',
  ink3: '#bcab97',
  hair: '#ecdfc9',
  honey: '#e79a4d',
  sageSoft: '#e2ecdf',
  sageInk: '#5f7a67',
  round:
    '"Hiragino Maru Gothic ProN", "Rounded Mplus 1c", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", system-ui, sans-serif',
} as const;

/** 画面いっぱいの温かい下地。中央にカードを置く。 */
const pageStyle = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  background: T.ground,
  color: T.ink,
  fontFamily: T.round,
  padding: '1.5rem 1rem',
} as const;

/** 中央のカード（まるく、やわらかい影）。 */
const cardStyle = {
  textAlign: 'center',
  lineHeight: 1.75,
  maxWidth: '26rem',
  width: '100%',
  background: T.surface,
  border: `1px solid ${T.hair}`,
  borderRadius: '24px',
  padding: '1.7rem 1.5rem 1.5rem',
  boxShadow: '0 22px 40px -30px rgba(150,110,60,.45)',
} as const;

/** 丸薬型ボタン。primary はハチミツ色（＝今できること）。 */
const pill = {
  fontFamily: 'inherit',
  fontWeight: 700,
  fontSize: '0.85rem',
  letterSpacing: '0.02em',
  padding: '0.55rem 1.25rem',
  borderRadius: '999px',
  border: '2px solid transparent',
  background: T.surface2,
  color: T.ink2,
  cursor: 'pointer',
} as const;
const pillPrimary = { ...pill, background: T.honey, color: '#ffffff' } as const;

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

/**
 * 結末アークの語り（EP-3.01 物語アーク・プレースホルダ）。
 * ⚠️ 去就の決定の中身・結末の意味づけ・本文・演出は**監修**。ここは遷移をやさしく繋ぐ器（同じトーン）。
 * reflection は終端（action なし）。
 */
const ARC_NARRATIVE: Partial<
  Record<GamePhase, { readonly text: string; readonly action?: string }>
> = {
  deciding: { text: '30日が、すぎました。\nこの子とのこれからを、決めるとき。', action: '決める' },
  ending: { text: 'あなたは、決めた。', action: 'つづける' },
  epilogue: { text: '——その後の、しずかな時間。', action: 'つづける' },
  reflection: { text: 'この30日を、ふりかえる。' },
};

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
  const onProceed = () => {
    runtime.advancePhase(); // 結末アークを1段進める（EP-3.01）
    runtime.save();
    refresh();
  };

  // 結末アーク（deciding/ending/epilogue/reflection）はやさしい語りの画面を出す（構図固定・Pillar 6）。
  const arc = ARC_NARRATIVE[view.gamePhase];
  if (arc) {
    return (
      <main style={pageStyle}>
        <div style={{ ...cardStyle, minHeight: '18rem', display: 'grid', placeItems: 'center' }}>
          <div>
            <p
              aria-label="結末"
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                lineHeight: 2,
                letterSpacing: '0.03em',
                margin: 0,
                whiteSpace: 'pre-line',
              }}
            >
              {arc.text}
            </p>
            {arc.action !== undefined && (
              <div style={{ marginTop: '1.8rem' }}>
                <button type="button" style={pillPrimary} onClick={onProceed}>
                  {arc.action}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  const ended = view.phase === 'ended';

  return (
    <main style={pageStyle}>
      <div style={cardStyle}>
        {/* Canvas シーン（装飾・ADR-001）。まるい窓に収める。本番アート（猫の絵）は監修/OI-6。 */}
        <div
          style={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${T.hair}`,
            lineHeight: 0,
            display: 'inline-block',
          }}
        >
          <Scene view={view} />
        </div>

        {/* 観測された猫の様子（見えた事実のみ）。canvas の a11y 代替も兼ねる。構図固定・変わるのは言葉だけ（B3 ③） */}
        {view.observations.length > 0 ? (
          <div aria-label="観察" style={{ margin: '1.1rem 0 0' }}>
            {view.observations.map((text, i) => (
              <p key={i} style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                {text}
              </p>
            ))}
          </div>
        ) : (
          <p
            aria-label="準備中"
            style={{ fontSize: '1.5rem', color: T.ink3, margin: '1.1rem 0 0' }}
          >
            …
          </p>
        )}

        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: T.ink3, margin: '0.85rem 0 0' }}>
          {ended
            ? `${view.day}日目・おわり`
            : `${view.day}日目 ・ ${view.segment + 1}/${view.segmentsPerDay}`}
        </p>
        <p
          style={{ fontSize: '0.72rem', fontWeight: 600, color: T.ink3, opacity: 0.75, margin: 0 }}
        >
          {restoreNote(view.restoreStatus)}
        </p>

        {/* 操作（OI-4 トーン）。観察は無制限・介入は有限（B2 §4）。ハチミツ色は「今できること」。 */}
        <div
          style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '1.35rem' }}
        >
          <button
            type="button"
            style={{ ...pillPrimary, opacity: view.actionSlots <= 0 ? 0.4 : 1 }}
            onClick={onFeed}
            disabled={view.actionSlots <= 0}
            aria-label={`餌をやる（残り${view.actionSlots}）`}
          >
            餌をやる（{view.actionSlots}）
          </button>
          <button
            type="button"
            style={{ ...pill, opacity: ended ? 0.4 : 1 }}
            onClick={onAdvance}
            disabled={ended}
          >
            次へ
          </button>
        </div>

        {/* 観察ノート（Player Knowledge・EP-2.07）。これまで見た事実だけをやさしく並べる（解釈しない・B7）。 */}
        {view.knowledgeNotes.length > 0 && (
          <div
            aria-label="観察ノート"
            style={{
              marginTop: '1.5rem',
              background: T.sageSoft,
              borderRadius: '16px',
              padding: '0.9rem 1.05rem 1rem',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                margin: '0 0 0.5rem',
                fontSize: '0.74rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: T.sageInk,
              }}
            >
              🐾 観察ノート
            </p>
            {view.knowledgeNotes.map((note, i) => (
              <p key={i} style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: T.ink2 }}>
                {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

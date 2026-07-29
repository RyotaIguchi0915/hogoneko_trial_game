import { useEffect, useState } from 'react';
import type { RestoreStatus } from '@core/index';
import type { GameRuntime, Decision, BondTier, PlacementKind } from '@app/index';
import { Scene } from './Scene';
import { HypothesisNote } from './HypothesisNote';
import { computeView } from './bootstrap';
import type { AppView } from './appView';
import { WATCH_TEMPO_MS, isWatchable, shouldStopWatching } from './watch';
import {
  type Tokens,
  useTheme,
  tokensFor,
  sceneColorsFor,
  pageStyle,
  cardStyle,
  pill,
  pillPrimary,
} from './theme';

/**
 * App — L4 Presentation のルート（EP-14 / EP-2.10 描画 / EP-2.08 介入 / EP-3.04 トーン「やさしい観察画」）。
 *
 * Canvas シーン（Scene）＋観察キャプション＋最小の操作（次へ / ご飯をあげる / 見守る）をやさしく提示する。
 * 見守る（EP-3.11）は不在の時間を穏やかに自動で流し、在室（世話できる瞬間）に達すると自動で手を止める。
 * ⚠️ トーンは OI-4「やさしい観察画」（ポップで優しく静か）。まるい形・温かい色・ハチミツ色の差し色。
 *    配色は theme.ts（ライト/ダークを prefers-color-scheme で追従・EP-3.12）。本設計・本番アートは監修（docs/17）。
 * ⚠️ この層は Cat State（真実）を受け取らない。受け取るのは Phenomenon 由来の文字列・進行・行動枠のみ（憲章 I-1）。
 * ⚠️ 達成演出・焦燥演出を持たない（Pillar 6）。数値は「観測回数」等の Player 側のみ（内部状態は出さない）。
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

/**
 * 結末の語り（EP-3.08 決定＋EP-4.06 理解を映す結末・プレースホルダ）。
 * ⚠️ 本文・意味づけ・演出は**監修**。ここは「30日でどれだけこの子を分かって寄り添えたか（bondTier）と
 *    選択（decision）を映す器」。数値は使わず質的カテゴリで出し分ける（観測境界 I-1）。
 * ⚠️ 迎える／もう少し見守る／送り出す の3つは**等価**（優劣をつけない・I-9）。送り出しを失敗として描かない。
 */
const DECIDE_PROMPT = '30日が、すぎました。\nあなたが見てきた、この子との——これから。';

const OUTCOME: Record<
  Decision,
  Record<BondTier, { readonly ending: string; readonly epilogue: string }>
> = {
  adopt: {
    bonded: {
      ending:
        'あなたは、この子を家族に迎えることにした。\nもう、この手のなかで安心して目を閉じる。',
      epilogue: '——それからの日々。\nこの子は、ここが自分の場所だと知っている。',
    },
    warming: {
      ending:
        'あなたは、この子を家族に迎えることにした。\nまだ少し遠慮がちだけれど、そばにいてくれる。',
      epilogue: '——それからの日々。\nこの子のペースで、距離は縮まっていく。',
    },
    distant: {
      ending:
        'あなたは、この子を家族に迎えることにした。\n心をひらいてくれるのは、きっとこれからだ。',
      epilogue: '——それからの日々。\nわからないことは、これから一つずつ。',
    },
  },
  extend: {
    bonded: {
      ending: 'あなたは、もう少し一緒に過ごすことにした。\n通じ合えた手応えを、確かめるように。',
      epilogue: '——観察はつづく。\nこの子のことが、少しずつ言葉になっていく。',
    },
    warming: {
      ending: 'あなたは、もう少し一緒に過ごすことにした。\nまだ知らない面が、きっとある。',
      epilogue: '——観察はつづく。\n急がず、この子を見ていく。',
    },
    distant: {
      ending: 'あなたは、もう少し一緒に過ごすことにした。\nこの子のことを、まだ決めきれない。',
      epilogue: '——観察はつづく。\nわかろうとすることを、やめない。',
    },
  },
  return: {
    bonded: {
      ending:
        'あなたは、この子を送り出すことにした。\nこれだけ通じ合えたからこそ、この子に合う場所を願う。',
      epilogue: '——その後。\nあの30日は、確かにあたたかかった。',
    },
    warming: {
      ending: 'あなたは、この子を送り出すことにした。\n少しずつ縮まった距離を、そっと手放す。',
      epilogue: '——その後。\nこの子は、次の場所でもきっと大丈夫。',
    },
    distant: {
      ending:
        'あなたは、この子を送り出すことにした。\nこの子には、もっと合う場所があるのかもしれない。',
      epilogue: '——その後。\nよく見た。それは、この子のための判断だった。',
    },
  },
};

const REFLECTION: Record<BondTier, string> = {
  bonded: 'この30日で、この子のことがずいぶん分かってきた。\nよく見て、よく待った。',
  warming: 'この30日で、この子のことが少しずつ分かってきた。\nまだ知らない面も、きっとある。',
  distant: 'この30日、この子はまだ多くを見せてくれなかった。\nわかろうとした時間は、無駄ではない。',
};

/** 結末アークの静かな画面（語り＋任意の操作ボタン）。構図固定・Pillar 6。 */
function ArcScreen({
  tokens,
  text,
  aria,
  actions,
}: {
  readonly tokens: Tokens;
  readonly text: string;
  readonly aria: string;
  readonly actions: readonly {
    readonly label: string;
    readonly onClick: () => void;
    readonly primary?: boolean;
  }[];
}) {
  const pillS = pill(tokens);
  const pillP = pillPrimary(tokens);
  return (
    <main style={pageStyle(tokens)}>
      <div
        style={{ ...cardStyle(tokens), minHeight: '18rem', display: 'grid', placeItems: 'center' }}
      >
        <div>
          <p
            aria-label={aria}
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              lineHeight: 2,
              letterSpacing: '0.03em',
              margin: 0,
              whiteSpace: 'pre-line',
            }}
          >
            {text}
          </p>
          {actions.length > 0 && (
            <div
              style={{
                marginTop: '1.8rem',
                display: 'flex',
                gap: '0.6rem',
                justifyContent: 'center',
              }}
            >
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  style={a.primary ? pillP : pillS}
                  onClick={a.onClick}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export function App({ runtime, initialView }: { runtime: GameRuntime; initialView: AppView }) {
  const [view, setView] = useState<AppView>(initialView);
  // 見守りモード（自動送り・EP-3.11）。プレイヤーが「見守る」で始め、在室に達すると自動で止まる。
  const [watching, setWatching] = useState(false);
  // 配色は OS のカラースキームに追従（ライト/ダーク・EP-3.12）。T 以下は毎レンダで解決する。
  const theme = useTheme();
  const T = tokensFor(theme);
  const page = pageStyle(T);
  const card = cardStyle(T);
  const pillS = pill(T);
  const pillP = pillPrimary(T);
  const sceneColors = sceneColorsFor(theme);

  const refresh = () => setView(computeView(runtime, initialView.restoreStatus));
  const onAdvance = () => {
    runtime.advanceSegment();
    runtime.save();
    refresh();
  };

  // 見守り: 不在の時間を穏やかに自動で流し、在室（世話できる瞬間）や本編の終わりで手を止める（EP-3.11）。
  // ⚠️ 進めるのは runtime.advanceSegment（決定論・G-3）。タイマーは「いつ進めるか」だけを担う。
  //    停止判定は「1コマ進めた後」の状態で行う（押した瞬間に在室でも、まず一歩は進む）。
  useEffect(() => {
    if (!watching) return;
    if (!isWatchable(view)) {
      setWatching(false);
      return;
    }
    const id = setTimeout(() => {
      runtime.advanceSegment();
      runtime.save();
      const next = computeView(runtime, initialView.restoreStatus);
      setView(next);
      if (shouldStopWatching(next)) setWatching(false);
    }, WATCH_TEMPO_MS);
    return () => clearTimeout(id);
  }, [watching, view, runtime, initialView.restoreStatus]);

  const onFeed = () => {
    runtime.feed();
    runtime.save(); // 介入は永続状態（空腹）を変える → チェックポイント保存（B4 §9.4）
    refresh();
  };
  const onPlace = (kind: PlacementKind) => {
    runtime.placeItem(kind); // 部屋を整える（環境を変える・猫は操作しない I-2・EP-4.04）
    runtime.save(); // 設置は永続（zoneOverrides / placements）→ 保存
    refresh();
  };
  const onToggleHypothesis = (id: string) => {
    runtime.toggleHypothesis(id); // 推し量る（正誤は判定されない・EP-4.03）
    runtime.save(); // 仮説はプレイヤーの入力＝観察履歴から導出できないので保存が要る
    refresh();
  };
  const onProceed = () => {
    runtime.advancePhase(); // 結末の語りを1段進める（ending→epilogue→reflection・EP-3.01）
    runtime.save();
    refresh();
  };
  const onDecide = (d: Decision) => {
    runtime.decide(d); // 去就を決める（deciding→ending・EP-3.08）
    runtime.save();
    refresh();
  };
  const onStart = () => {
    runtime.start(); // タイトル→本編（title→playing・EP-3.10）
    runtime.save();
    refresh();
  };
  const onRestart = () => {
    // もう一度あずかる（リプレイ・EP-3.13）。セーブを消し、まっさらな状態で起動し直す。
    // ⚠️ 巻き戻しではなく「別の子・別の30日」。確実に新規状態にするためリロードで作り直す（Pillar 4）。
    runtime.clearSave();
    if (typeof window !== 'undefined') window.location.reload();
  };

  // タイトル（title）: 前提をやさしく伝え、「はじめる」で本編へ（新規プレイの入口・EP-3.10）。
  if (view.gamePhase === 'title') {
    return (
      <main style={page}>
        <div style={{ ...card, minHeight: '20rem', display: 'grid', placeItems: 'center' }}>
          <div>
            <h1
              style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                lineHeight: 1.4,
                margin: '0 0 1.3rem',
              }}
            >
              保護猫トライアル30日
            </h1>
            <p
              style={{
                fontSize: '1rem',
                color: T.ink2,
                lineHeight: 2,
                margin: '0 0 2rem',
                whiteSpace: 'pre-line',
              }}
            >
              {
                'あなたは、この子を30日あずかることになった。\nできるのは——見て、待って、そっと世話をすること。\nさいごに、この子との「これから」を決める。'
              }
            </p>
            <button type="button" style={pillP} onClick={onStart}>
              はじめる
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 去就の決定（deciding）: 30日の締めくくり。迎える／もう少し見守る／送り出す（3つは等価・I-9・Pillar 6）。
  if (view.gamePhase === 'deciding') {
    return (
      <ArcScreen
        tokens={T}
        aria="決定"
        text={DECIDE_PROMPT}
        actions={[
          { label: '迎える', onClick: () => onDecide('adopt'), primary: true },
          { label: 'もう少し見守る', onClick: () => onDecide('extend') },
          { label: '送り出す', onClick: () => onDecide('return') },
        ]}
      />
    );
  }
  // 結末の語り（ending/epilogue/reflection）: 決定と絆（bondTier）で出し分ける。
  if (
    view.gamePhase === 'ending' ||
    view.gamePhase === 'epilogue' ||
    view.gamePhase === 'reflection'
  ) {
    const decision: Decision = view.decision ?? 'adopt'; // 通常は決定済み（防御的既定）
    const tier: BondTier = view.bondTier;
    if (view.gamePhase === 'reflection') {
      // 終端。ここから「もう一度あずかる」でタイトルへ戻れる（リプレイ・EP-3.13）。
      return (
        <ArcScreen
          tokens={T}
          aria="ふりかえり"
          text={REFLECTION[tier]}
          actions={[{ label: 'もう一度あずかる', onClick: onRestart }]}
        />
      );
    }
    const text =
      view.gamePhase === 'ending'
        ? OUTCOME[decision][tier].ending
        : OUTCOME[decision][tier].epilogue;
    return (
      <ArcScreen
        tokens={T}
        aria="結末"
        text={text}
        actions={[{ label: 'つづける', onClick: onProceed, primary: true }]}
      />
    );
  }

  const ended = view.phase === 'ended';

  return (
    <main style={page}>
      <div style={card}>
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
          <Scene view={view} colors={sceneColors} />
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
          style={{
            display: 'flex',
            gap: '0.6rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '1.35rem',
          }}
        >
          <button
            type="button"
            style={{ ...pillP, opacity: view.actionSlots <= 0 || watching ? 0.4 : 1 }}
            onClick={onFeed}
            disabled={view.actionSlots <= 0 || watching}
            aria-label={`ご飯をあげる（残り${view.actionSlots}）`}
          >
            ご飯をあげる（{view.actionSlots}）
          </button>
          {/* 見守る/とまる（自動送り・EP-3.11）。不在の時間を流し、在室で自動的に手が止まる。 */}
          <button
            type="button"
            style={{ ...(watching ? pillP : pillS), opacity: ended ? 0.4 : 1 }}
            onClick={() => setWatching((w) => !w)}
            disabled={ended}
            aria-label={watching ? '見守りをとめる' : '見守る（自動で時間を進める）'}
          >
            {watching ? 'とまる' : '見守る'}
          </button>
          <button
            type="button"
            style={{ ...pillS, opacity: ended || watching ? 0.4 : 1 }}
            onClick={onAdvance}
            disabled={ended || watching}
          >
            次へ
          </button>
        </div>

        {/* 部屋を整える（環境アクション・EP-4.04）。猫は操作しない——場所を用意して、待つ。 */}
        {/*   その子が使うか・落ち着くかは個体次第（合っていれば効く・外れれば効かない）。 */}
        <div style={{ marginTop: '1.1rem' }}>
          <p
            style={{
              margin: '0 0 0.5rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: T.ink3,
            }}
          >
            部屋を整える
          </p>
          <div
            style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {(
              [
                ['hiding_place', '隠れ家を置く', '隠れ家を置いた'],
                ['high_perch', '高い台を置く', '高い台を置いた'],
                ['quiet_food', 'ごはんを静かな隅へ', 'ごはんを静かな隅へ移した'],
              ] as const
            ).map(([kind, label, done]) => {
              const placed = view.placements.includes(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  style={{ ...pillS, opacity: placed || watching ? 0.4 : 1 }}
                  onClick={() => onPlace(kind)}
                  disabled={placed || watching}
                >
                  {placed ? `✓ ${done}` : label}
                </button>
              );
            })}
          </div>
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

        {/* 仮説帳（EP-4.03）。見た事実の下に、そこから推し量った言葉が並ぶ。正誤は示さない（U-8）。 */}
        <HypothesisNote
          tokens={T}
          hypotheses={view.hypotheses}
          onToggle={onToggleHypothesis}
          disabled={watching}
        />
      </div>
    </main>
  );
}

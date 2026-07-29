import type { Tokens } from './theme';
import type { HypothesisView } from './appView';

/**
 * 仮説帳 — プレイヤーが観察から推し量って持つ言葉（L4 Presentation / EP-4.03 / docs/18 B-C）
 *
 * ⚠️ ここに並ぶのは**プレイヤー自身の推量**であって、猫についての正解ではない。
 *    正誤の印（✓/✗）・スコア・確信度メーターを持たない（docs/16 §2.8 U-8 / 憲章 I-1）。
 *    **選んでいるかどうかは色で示す**——チェックマークは「正解」に見えるので使わない。
 * ⚠️ 立てられるのは**観測した現象についてだけ**（docs/06:660）。候補の出し入れは L3 が決め、
 *    ここは受け取った候補を並べるだけ。まだ何も観測していなければ、この節ごと現れない。
 * ⚠️ 仮説を持つと観察文が詳しくなるが、それは正誤の合図ではない（外れた仮説でも詳しくなる）。
 *    UI でも「合っています」の類を一切示唆しない。
 */
export function HypothesisNote({
  tokens,
  hypotheses,
  onToggle,
  disabled = false,
}: {
  readonly tokens: Tokens;
  readonly hypotheses: readonly HypothesisView[];
  readonly onToggle: (id: string) => void;
  readonly disabled?: boolean;
}) {
  // まだ何も観測していなければ、推し量る言葉も持てない（docs/06:660）。
  if (hypotheses.length === 0) return null;

  return (
    <div
      aria-label="思ったこと"
      style={{
        marginTop: '0.75rem',
        background: tokens.surface2,
        borderRadius: '16px',
        padding: '0.9rem 1.05rem 1rem',
        textAlign: 'left',
      }}
    >
      <p
        style={{
          margin: '0 0 0.6rem',
          fontSize: '0.74rem',
          fontWeight: 800,
          letterSpacing: '0.04em',
          color: tokens.ink3,
        }}
      >
        💭 思ったこと
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {hypotheses.map((h) => (
          <button
            key={h.id}
            type="button"
            aria-pressed={h.formed}
            disabled={disabled}
            onClick={() => onToggle(h.id)}
            style={{
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              fontWeight: 600,
              lineHeight: 1.6,
              textAlign: 'left',
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              cursor: disabled ? 'default' : 'pointer',
              // 立てている＝気づきの色（sage）が灯る。立てていない＝静かな枠だけ。正誤ではない。
              border: `1px solid ${h.formed ? 'transparent' : tokens.hair}`,
              background: h.formed ? tokens.sageSoft : 'transparent',
              color: h.formed ? tokens.sageInk : tokens.ink3,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {h.label}
          </button>
        ))}
      </div>
    </div>
  );
}

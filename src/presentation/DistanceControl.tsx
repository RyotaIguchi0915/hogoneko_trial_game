import type { Tokens } from './theme';
import type { HumanDistance } from '@app/index';

/**
 * あなたの居場所 — 猫との距離を選ぶ（L4 Presentation / EP-4.04c / docs/18 B-D）
 *
 * ⚠️ これは**猫を呼ぶ操作ではない**（憲章 I-2）。動かせるのは自分だけで、近づいたからといって
 *    猫が来る保証はない。UI でもそれを示唆しない——「呼ぶ」「なでる」の語を使わず、効果も予告しない。
 * ⚠️ 押せる操作（ボタン群）ではなく**いまの状態の選択**として並べる。行動枠も消費しない
 *    （居場所は介入ではなく状態・B2 §4）。docs/16 §2.6 の操作群の数を増やさないための形でもある。
 * ⚠️ 猫がどう感じているかは、ここには一切出さない。分かるのは観察だけ（I-1）。
 */
const OPTIONS: readonly { readonly value: HumanDistance; readonly label: string }[] = [
  { value: 'near', label: 'そばに' },
  { value: 'normal', label: 'ふつう' },
  { value: 'far', label: '離れて' },
];

export function DistanceControl({
  tokens,
  value,
  onChange,
  disabled = false,
}: {
  readonly tokens: Tokens;
  readonly value: HumanDistance;
  readonly onChange: (next: HumanDistance) => void;
  readonly disabled?: boolean;
}) {
  return (
    <div
      aria-label="あなたの居場所"
      style={{
        marginTop: '0.9rem',
        display: 'flex',
        gap: '0.4rem',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: tokens.ink3,
          marginRight: '0.2rem',
        }}
      >
        あなたの居場所
      </span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          style={{
            fontFamily: 'inherit',
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '0.22rem 0.66rem',
            borderRadius: '999px',
            border: 'none',
            // 選んでいる場所だけが静かに沈む。効果の良し悪しは示さない。
            background: value === o.value ? tokens.surface2 : 'transparent',
            color: value === o.value ? tokens.ink : tokens.ink3,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

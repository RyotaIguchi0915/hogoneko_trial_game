import type { StateChange } from '@data/schemas/event';

/**
 * Event Effects — 発火イベントの StateChange が環境へ及ぼす効果（L2 Simulation / B8 §2.3 / EP-2.09 発火 runtime）
 *
 * イベントは環境・刺激・資源だけを変える（猫の内部状態は変えない・§2.3、型・schema で `cat.*` は不可）。
 * その後の猫の反応は Cat AI が自律的に決める（本モジュールは env への変化量だけを返す）。
 *
 * ⚠️⚠️ 効果量はすべて**仮値・監修待ち**（数値バランス＝人間ドメイン・DevConst ④）。
 * ⚠️ 本来は Zone 属性（cover/height/自己臭 等）を変え、そこから B10 の式で ZoneSecurity/Comfort を導く。
 *    MVP は「代表 Zone の security/comfort を直接調整する」簡略化。監修で Zone 属性ベースに差し替える。
 */

/** 発火が環境（代表 Zone）へ与える調整量（security/comfort の加算・[-1,1] 想定）。 */
export interface EnvironmentDelta {
  readonly security: number;
  readonly comfort: number;
}

const ZERO: EnvironmentDelta = { security: 0, comfort: 0 };

/** 仮の効果係数（監修待ち）。 */
export const EVENT_EFFECT_PROVISIONAL = {
  /** 遮蔽（cover）の中立点。これより高いと安全側、低いと不安側へ。 */
  coverNeutral: 0.5,
  /** cover 1単位あたりの security への寄与（遮蔽が高い＝隠れられる＝安全）。 */
  coverToSecurity: 0.4,
  /** 高所だが遮蔽のない場所の security 寄与（弱め）。 */
  heightCoverToSecurity: 0.2,
  /** 隠れ場所（資源）追加の効果。 */
  hideBox: { security: 0.2, comfort: 0.1 },
} as const;

/**
 * 1つの StateChange が代表 Zone の環境へ与える調整量を返す（純粋・仮値）。
 * 未知 command は無変化（0）。方向（符号）のみが本質で、値は監修で確定する。
 */
export function environmentEffect(change: StateChange): EnvironmentDelta {
  const P = EVENT_EFFECT_PROVISIONAL;
  const cover = typeof change.params?.cover === 'number' ? change.params.cover : undefined;
  switch (change.command) {
    case 'setZoneCover':
      return cover === undefined
        ? ZERO
        : { security: (cover - P.coverNeutral) * P.coverToSecurity, comfort: 0 };
    case 'setZoneHeightCover':
      return cover === undefined
        ? ZERO
        : { security: (cover - P.coverNeutral) * P.heightCoverToSecurity, comfort: 0 };
    case 'placeHideBox':
      return { security: P.hideBox.security, comfort: P.hideBox.comfort };
    default:
      return ZERO;
  }
}

/** 2つの環境調整量を合成する（純粋・累積用）。 */
export function combineDelta(a: EnvironmentDelta, b: EnvironmentDelta): EnvironmentDelta {
  return { security: a.security + b.security, comfort: a.comfort + b.comfort };
}

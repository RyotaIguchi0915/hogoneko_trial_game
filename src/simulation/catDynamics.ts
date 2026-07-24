import type { Needs, Affect, Relationship } from '@core/state/catState';

/**
 * Cat Dynamics — 猫状態の各更新ステップ（L2 Simulation / B5 ②③⑤⑥）
 *
 * すべて純粋関数。1 Segment 分の推移を計算する。決定論的（RNG を使わない）。
 * ⚠️ 行動選択の揺らぎ（RNG stream `behavior`/`micro`）は Cat AI（EP-2.02）の担当。本ファイルは
 *    状態ダイナミクスのみを扱い、決定論を構成で保証する。
 * ⚠️ 係数はすべて**仮値**（監修・実測で確定・B5/B6 付録C）。方向と非対称のみが本質（B5 §1.107）。
 */

// --- 値域ヘルパ ---
export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** 仮の係数群（監修待ち）。1箇所に集約して調整を容易にする（B0 §14.2）。 */
export const PROVISIONAL = {
  /** Needs 圧の Segment 上昇率（欲求別・仮値）。 */
  needsRise: { hunger: 0.12, elimination: 0.15 },
  /** Vigilance の下降（baseline への接近率）。上昇は刺激駆動で EP-2.09/2.02。 */
  vigilanceDecay: 0.6,
  /** Vigilance baseline = base + stressGain × StressLoad（B5 §3.4: ストレスが baseline を上げる）。 */
  vigilanceBase: 0.15,
  vigilanceStressGain: 0.5,
  /** StressLoad: dS = alpha·max(0, Vigilance−theta) − beta。上限 0.8（B5 §3.2）。 */
  stress: { alpha: 0.1, theta: 0.4, beta: 0.03, cap: 0.8 },
  /** Arousal は Vigilance を追う（慣性あり）。 */
  arousalTrack: 0.6,
  /** Familiarity の在室 Segment ごとの微増（ほぼ不可逆）。 */
  familiarityRise: 0.02,
  /** Safety 圧 = securityWeight·(1−ZoneSecurity) + vigilanceWeight·Vigilance − trustRelief·Trust。 */
  safety: { securityWeight: 0.4, vigilanceWeight: 0.6, trustRelief: 0.3 },
} as const;

// --- 各ステップ（§8.1 の該当番号を付す） ---

/** §8.1 step4: 時間経過による Needs 圧の上昇（safety を除く。safety は step11）。 */
export function raiseNeedsPressure(needs: Needs): Needs {
  return {
    safety: needs.safety, // step11 で更新
    hunger: clamp01(needs.hunger + PROVISIONAL.needsRise.hunger),
    elimination: clamp01(needs.elimination + PROVISIONAL.needsRise.elimination),
  };
}

/**
 * §8.1 step6: Vigilance を baseline へ減衰させる（非対称の下降側）。
 * 上昇（刺激・突発音）は EP-2.09/2.02 が加える。baseline は StressLoad が押し上げる。
 */
export function updateVigilance(affect: Affect): number {
  const baseline = clamp01(
    PROVISIONAL.vigilanceBase + PROVISIONAL.vigilanceStressGain * affect.stressLoad,
  );
  return clamp01(baseline + (affect.vigilance - baseline) * PROVISIONAL.vigilanceDecay);
}

/** §8.1 step7: StressLoad = Vigilance の積分 − 減衰（上限 0.8）。 */
export function updateStressLoad(stressLoad: number, vigilance: number): number {
  const { alpha, theta, beta, cap } = PROVISIONAL.stress;
  const delta = alpha * Math.max(0, vigilance - theta) - beta;
  return clamp(stressLoad + delta, 0, cap);
}

/** §8.1 step8: Arousal は Vigilance を追う。Valence は関係と充足度から。 */
export function updateArousal(arousal: number, vigilance: number): number {
  return clamp01(PROVISIONAL.arousalTrack * vigilance + (1 - PROVISIONAL.arousalTrack) * arousal);
}
export function updateValence(needs: Needs, relationship: Relationship): number {
  // 未充足が大きいほど不快、Trust が高いほど快（仮）。
  const avgUnmet = (needs.hunger + needs.elimination + needs.safety) / 3;
  return clamp(relationship.trust - avgUnmet, -1, 1);
}

/** §8.1 step9: Relationship の Segment 更新（在室で Familiarity 微増。Trust は日次＝§8.3）。 */
export function updateRelationship(relationship: Relationship, inRoom: boolean): Relationship {
  return {
    trust: relationship.trust,
    familiarity: clamp01(relationship.familiarity + (inRoom ? PROVISIONAL.familiarityRise : 0)),
  };
}

/** §8.1 step11: N-01 安全欲求（圧）。警戒・低い ZoneSecurity で上昇、Trust で緩和。 */
export function updateSafety(
  affect: Affect,
  relationship: Relationship,
  zoneSecurity: number,
): number {
  const { securityWeight, vigilanceWeight, trustRelief } = PROVISIONAL.safety;
  return clamp01(
    securityWeight * (1 - zoneSecurity) +
      vigilanceWeight * affect.vigilance -
      trustRelief * relationship.trust,
  );
}

/**
 * §8.1 step12: ゲート適用。effective urgency = 各欲求圧を安全欲求と情動でゲートする。
 * 安全欲求がすべてをゲートする（B5 §2.2）: 安全が切迫していると他欲求は抑制される。
 * ⚠️ 派生値（状態に保存しない）。Cat AI（EP-2.02）が行動選択に使う。
 */
export function effectiveUrgency(needs: Needs): {
  readonly safety: number;
  readonly hunger: number;
  readonly elimination: number;
} {
  const gate = 1 - needs.safety; // 安全が切迫（1）→ 他欲求ゲート 0
  return {
    safety: needs.safety,
    hunger: needs.hunger * gate,
    elimination: needs.elimination * gate,
  };
}

import type { Needs, Affect, Relationship, Behavior } from '@core/state/catState';

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
  /** Vigilance baseline = base + stressGain × StressLoad + distressGain × 欲求不快（B5 §3.4）。 */
  vigilanceBase: 0.15,
  vigilanceStressGain: 0.5,
  /**
   * 満たされない欲求（空腹）が生む不安（B5 §2/§3.4）。閾値を超えた空腹が警戒 baseline を押し上げる。
   * ⚠️ これは「ご飯＝信頼+」のメーターではない（憲章 I-2）。快適さを損なうと落ち着けず、結果として信頼が育ちにくい、
   *    という間接経路。世話（空腹を鎮める）は絆を"買う"のでなく、安心できる条件を整える。
   */
  needsDistress: { hungerThreshold: 0.45, vigilanceGain: 0.7 },
  /** StressLoad: dS = alpha·max(0, Vigilance−theta) − beta。上限 0.8（B5 §3.2）。 */
  stress: { alpha: 0.1, theta: 0.4, beta: 0.03, cap: 0.8 },
  /** Arousal は Vigilance を追う（慣性あり）。 */
  arousalTrack: 0.6,
  /** Familiarity の在室 Segment ごとの微増（ほぼ不可逆）。 */
  familiarityRise: 0.02,
  /** Safety 圧 = securityWeight·(1−ZoneSecurity) + vigilanceWeight·Vigilance − trustRelief·Trust。 */
  safety: { securityWeight: 0.4, vigilanceWeight: 0.6, trustRelief: 0.3 },
  /** 行動による Need 充足（§8.1 step17）。eating で空腹が下がる。 */
  satisfaction: { eatingHungerRelief: 0.35 },
  /**
   * 日次 Trust 更新（§8.3・§5.2）。gain=穏やかに過ごした日の漸増（遅い）、loss=ストレスによる即時低下（速い）。
   * 非対称: gain ≪ loss（信頼は数日で育ち、裏切り/強い恐怖で即座に崩れる）。
   */
  trustDaily: { gain: 0.04, loss: 0.15 },
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
export function updateVigilance(affect: Affect, needsDistress = 0): number {
  const baseline = clamp01(
    PROVISIONAL.vigilanceBase +
      PROVISIONAL.vigilanceStressGain * affect.stressLoad +
      PROVISIONAL.needsDistress.vigilanceGain * needsDistress,
  );
  return clamp01(baseline + (affect.vigilance - baseline) * PROVISIONAL.vigilanceDecay);
}

/**
 * 満たされない欲求が生む不快（0..1）。閾値を超えた空腹の分だけ不安になる（B5 §2）。純粋。
 * ⚠️ MVP は空腹のみ（elimination 等は監修で拡充）。
 */
export function needsDistress(needs: Needs): number {
  return clamp01(Math.max(0, needs.hunger - PROVISIONAL.needsDistress.hungerThreshold));
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

/**
 * §8.1 step9: Relationship の Segment 更新（在室で Familiarity 微増。Trust は日次＝updateTrustDaily）。
 * famScale は日数比のペース補正（短縮デモで弧全体を縮尺に・EP-3.09）。1 で本編どおり。
 */
export function updateRelationship(
  relationship: Relationship,
  inRoom: boolean,
  famScale = 1,
): Relationship {
  return {
    trust: relationship.trust,
    familiarity: clamp01(
      relationship.familiarity + (inRoom ? PROVISIONAL.familiarityRise * famScale : 0),
    ),
  };
}

/**
 * §8.3 日次 Trust 更新。1日1回、日境界で適用する（Segment 更新とは別リズム）。
 * 穏やか（低警戒・低ストレス）に過ごし、慣れ（familiarity）が育つほど信頼は少しずつ上がる（遅い）。
 * ストレスは信頼を即座に削る（速い・非対称・B5 §5.2）。
 * ⚠️ 係数は仮値（監修）。⚠️ 世話（介入）による加点は将来の拡充（今は「穏やかな在室＝安全の学習」で育つ）。
 */
export function updateTrustDaily(
  relationship: Relationship,
  affect: Affect,
  gainScale = 1,
): Relationship {
  const { gain, loss } = PROVISIONAL.trustDaily;
  // 落ち着き（0..1）: 警戒もストレスも低いほど高い。
  const calm = (1 - affect.vigilance) * (1 - affect.stressLoad);
  // 慣れているほど、穏やかな時間が信頼に変わりやすい（0.5〜1.0 の係数）。
  // gainScale は日数比の補正（短縮デモで同じ弧を縮尺で見せる・EP-3.09）。1 で本編どおり。
  const rise = gain * gainScale * calm * (0.5 + 0.5 * relationship.familiarity);
  // ストレスは信頼を即座に削る（非対称）。gainScale は掛けない（下降は速いまま）。
  const drop = loss * affect.stressLoad;
  return {
    trust: clamp01(relationship.trust + rise - drop),
    familiarity: relationship.familiarity,
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
 * §8.1 step17: 行動による Need 充足。選択された行動が満たす欲求を下げる。
 * MVP は eating→hunger のみ（監修で拡充）。行動が Need を下げることで悪循環でない安定が生まれる。
 */
export function applyNeedSatisfaction(needs: Needs, behavior: Behavior): Needs {
  if (behavior === 'eating') {
    return {
      ...needs,
      hunger: clamp01(needs.hunger - PROVISIONAL.satisfaction.eatingHungerRelief),
    };
  }
  return needs;
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

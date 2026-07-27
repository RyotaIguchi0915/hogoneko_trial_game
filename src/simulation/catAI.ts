import type { Rng } from '@core/index';
import type { Needs, Affect, Relationship, Behavior } from '@core/state/catState';
import { clamp01 } from './catDynamics';

/**
 * Cat AI — 行動選択（層B: Utility AI / L2 Simulation / B6 §2.4-2.5 / B5 §8.1 step14-15）
 *
 * この猫はプレイヤーのためでなく「自分の必要」のために行動する（B6 §1.1 / 憲章 I-2）。
 * ⚠️ argmax は使わない。上位候補から**温度付き softmax** で確率選択する（B6 §2.5）。
 *    τ（温度）は「ランダム性」ではなく**性格**。低いほど予測可能、高いほど気まぐれ（AI-2: 実行中不変）。
 * ⚠️ 決定論: 選択は behavior ストリーム（seed+day+segment・B5 §8.4）の RNG で行う。同一シードで同一。
 *    RNG 未指定時は argmax にフォールバック（純粋テスト用）。
 * ⚠️ 係数・τ はすべて**仮値（監修待ち・B6 付録C）**。方向のみが本質:
 *    怖い/警戒→隠れる、空腹かつ安全→食べる、落ち着き→休む/毛づくろい/探索。安全欲求が他をゲートする（B5 §2.2）。
 */

export interface BehaviorInput {
  readonly needs: Needs;
  readonly affect: Affect;
  readonly relationship: Relationship;
}

export const BEHAVIOR_CANDIDATES: readonly Behavior[] = [
  'resting',
  'exploring',
  'hiding',
  'eating',
  'grooming',
  'alert',
];

/** 仮の性格・重み（監修待ち）。τ は個体プロファイルで変わる（B6 §2.5）。 */
export const AI_PROVISIONAL = {
  /** softmax 温度＝性格。低い＝慎重で予測可能な個体（保護直後の想定）。 */
  temperature: 0.15,
} as const;

/** 各行動の Utility（0 付近〜1 超。相対値のみ意味を持つ）。仮の因子。 */
export function behaviorUtility(
  behavior: Behavior,
  { needs, affect, relationship }: BehaviorInput,
): number {
  switch (behavior) {
    case 'hiding':
      // 安全欲求・警戒が高い / 信頼が低いほど隠れる
      return 0.6 * needs.safety + 0.4 * affect.vigilance + 0.3 * (1 - relationship.trust);
    case 'alert':
      // 警戒は高いが隠れるほどではない（見張る）
      return 0.7 * affect.vigilance + 0.2 * needs.safety;
    case 'eating':
      // 空腹。ただし安全欲求がゲートする（怖いと食べない・B5 §2.2）
      return 1.2 * needs.hunger * (1 - needs.safety);
    case 'grooming':
      // 落ち着き（安全欲求が低い）+ 慣れ + 快
      return (
        0.5 * (1 - needs.safety) +
        0.3 * relationship.familiarity +
        0.3 * Math.max(0, affect.valence)
      );
    case 'exploring':
      // 落ち着き + 慣れ + 覚醒（好奇）
      return 0.4 * (1 - needs.safety) + 0.3 * relationship.familiarity + 0.2 * affect.arousal;
    case 'resting':
      // 低需要・低覚醒・低警戒のときの既定
      return 0.4 * (1 - needs.safety) + 0.3 * (1 - affect.arousal) + 0.2 * (1 - affect.vigilance);
  }
}

/** 全候補の Utility を返す（診断・テスト用）。 */
export function behaviorUtilities(input: BehaviorInput): Record<Behavior, number> {
  const out = {} as Record<Behavior, number>;
  for (const b of BEHAVIOR_CANDIDATES) out[b] = behaviorUtility(b, input);
  return out;
}

/**
 * 行動を選択する（B6 §2.5 温度付き softmax）。
 * ⚠️ 環境（Zone）の影響は既に updateSafety 等で state に織り込まれているため、ここでは state のみを見る。
 * @param rng behavior ストリームの RNG。省略時は argmax（決定論フォールバック）。
 */
export function selectBehavior(input: BehaviorInput, rng?: Rng): Behavior {
  const utils = BEHAVIOR_CANDIDATES.map((b) => behaviorUtility(b, input));

  if (!rng) {
    // フォールバック: argmax（候補順で安定なタイブレーク）
    let best = 0;
    for (let i = 1; i < utils.length; i++) if (utils[i]! > utils[best]!) best = i;
    return BEHAVIOR_CANDIDATES[best]!;
  }

  // softmax（数値安定化のため max を引く）
  const tau = AI_PROVISIONAL.temperature;
  const maxU = Math.max(...utils);
  const exps = utils.map((u) => Math.exp((u - maxU) / tau));
  const sum = exps.reduce((a, b) => a + b, 0);

  let r = clamp01(rng.next()) * sum;
  for (let i = 0; i < BEHAVIOR_CANDIDATES.length; i++) {
    r -= exps[i]!;
    if (r <= 0) return BEHAVIOR_CANDIDATES[i]!;
  }
  return BEHAVIOR_CANDIDATES[BEHAVIOR_CANDIDATES.length - 1]!;
}

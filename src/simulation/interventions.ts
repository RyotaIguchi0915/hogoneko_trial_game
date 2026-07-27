import type { CatState } from '@core/state/catState';
import { clamp01 } from './catDynamics';

/**
 * Interventions — プレイヤーの介入が真実へ及ぼす効果（L2 Simulation / B2 §4 / B9 §3.4）
 *
 * ⚠️ 介入は「猫を操作する」ものではない（憲章 I-2）。環境・資源への働きかけの結果として
 *    猫の状態が変わる。ここでは純粋関数で「効果」だけを定義し、行動枠の消費・可否は合成ルートが管理する。
 * ⚠️ 効果量は仮値（監修・B9 付録A）。
 */

/** 仮の介入効果量（監修待ち）。 */
export const INTERVENTION_PROVISIONAL = {
  /** 給餌で空腹が下がる量。 */
  feedHungerRelief: 0.4,
} as const;

/** 餌をやる: 空腹（hunger）を下げる（B9 §3.4「資源補充」相当）。純粋。 */
export function feedCat(cat: CatState): CatState {
  return {
    ...cat,
    needs: {
      ...cat.needs,
      hunger: clamp01(cat.needs.hunger - INTERVENTION_PROVISIONAL.feedHungerRelief),
    },
  };
}

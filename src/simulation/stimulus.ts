import type { Rng } from '@core/index';
import type { Affect } from '@core/state/catState';
import { clamp01 } from './catDynamics';

/**
 * Stimulus — 突発的な刺激（音・驚き）で警戒が跳ね上がる（L2 Simulation / B5 §8.1 step5・§3.2）
 *
 * Vigilance は非対称: **上昇は即時（刺激駆動）・下降は時間**（B5 §3.2）。本モジュールが「上昇側」を担う。
 * 家庭の物音のような環境刺激を、決定論的な確率でときどき発生させる（RNG stream 'stimulus'）。
 * これがないと中盤の情動が平坦になり「何も起きない」感じになる（診断で確認）。
 * ⚠️ 発生確率・跳ね上げ量は**仮値・監修待ち**（B5 付録C）。方向のみが本質: 突発→警戒↑→（続けば）ストレス蓄積↑。
 * ⚠️ イベント駆動の刺激（B8 StateChange target='stimulus'）は将来。ここは環境の環境音（アンビエント）のみ。
 */
export const STIMULUS_PROVISIONAL = {
  /** 1 Segment あたりの突発刺激の発生確率。 */
  chance: 0.14,
  /** 発生時に Vigilance へ加える跳ね上げ量。 */
  vigilanceSpike: 0.5,
} as const;

/** この Segment に突発刺激が起きたか（決定論的・rng は用途別 stream の fork を渡す）。 */
export function rollStimulus(rng: Rng): boolean {
  return rng.next() < STIMULUS_PROVISIONAL.chance;
}

/** 突発刺激で Vigilance を跳ね上げた Affect を返す（純粋・§8.1 step5）。以降の減衰/ストレスに伝播する。 */
export function applyStimulusVigilance(affect: Affect): Affect {
  return { ...affect, vigilance: clamp01(affect.vigilance + STIMULUS_PROVISIONAL.vigilanceSpike) };
}

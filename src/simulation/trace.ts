import type { Behavior } from '@core/state/catState';
import type { TraceKind } from '@core/state/trace';

/**
 * Trace 生成 — 不在 Segment に猫の行動が残す痕跡（L2 Simulation / B5 / B7 / EP-2.06）
 *
 * 「見ていない間」に選ばれた行動から、観測可能な痕跡を**決定論的**に導く（純粋関数）。
 * ⚠️ 数値は介在しない。行動（真実）→ 痕跡種別の写像のみ。真実数値は露出しない（Success 条件・I-1）。
 * ⚠️ 一部の行動は痕跡を残さない（hiding/alert → null）。「何も見つからない」こと自体が推理の材料（B2 §3.2）。
 * ⚠️ MVP は行動1つ→痕跡1つの単純写像。確率的な残り方・複合痕跡は監修（RNG stream `trace`）で拡充。
 */
const BEHAVIOR_TO_TRACE: Readonly<Record<Behavior, TraceKind | null>> = {
  grooming: 'shed_fur', // 毛づくろい → 毛が落ちている
  exploring: 'moved_object', // 探索 → 物の位置が変わっている
  eating: 'food_reduced', // 採食 → ごはんが減っている
  resting: 'warm_hollow', // 休息 → くぼみ・寝床の跡
  hiding: null, // 潜伏 → 跡を残さない
  alert: null, // 警戒 → 持続する跡を残さない
};

/** 行動から痕跡種別を得る（決定論的・純粋）。痕跡を残さない行動は null。 */
export function traceForBehavior(behavior: Behavior): TraceKind | null {
  return BEHAVIOR_TO_TRACE[behavior];
}

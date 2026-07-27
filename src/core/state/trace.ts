/**
 * Trace — 不在 Segment の産物（痕跡）（L1 Core / B4 §9.2 Persisted / B5 / B7）
 *
 * 猫が「見ていない間」に活動した結果、部屋に残る観測可能な事実。推理の主戦場（B2 §3.2）。
 * ⚠️ これは真実（Cat State の数値）ではなく、観測可能な「跡」。数値を含まない（憲章 I-1）。
 *    種別（kind）だけを持ち、L3 Gateway が Phenomenon（subject:'trace'）へ変換する。
 * ⚠️ 保存対象（Persisted）。在室で発見されるまで保持し、発見時に観察履歴へ記録される。
 */

/**
 * 痕跡の種別。descriptor と 1:1（`phenomenon.<kind>`）で対応させ、写像の齟齬を防ぐ。
 * ⚠️ MVP の最小セット（監修で拡充）。
 */
export type TraceKind = 'shed_fur' | 'moved_object' | 'food_reduced' | 'warm_hollow';

export interface Trace {
  readonly kind: TraceKind;
}

/** 痕跡を追記する（在室で発見するまで累積・純粋・不変）。 */
export function appendTraces(
  traces: readonly Trace[],
  entries: readonly Trace[],
): readonly Trace[] {
  return entries.length === 0 ? traces : [...traces, ...entries];
}

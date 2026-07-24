/**
 * Cat State — 猫の真実（L2 限定・憲章 I-1 / B4 §8.5）
 *
 * ⚠️ この型は L3 Perception / L4 Presentation に露出してはならない。
 *    Presentation が受け取れるのは Phenomenon（数値を含まない現象）のみ。
 * ⚠️ Sprint 2 で Needs / Affect / Relationship / Behavior / 悪循環カウンタ 等を充填する。
 *    現時点は基盤検証のための最小形。
 */
export interface CatState {
  /** 到着済みか（Day 0 の到着イベント後に true） */
  readonly arrived: boolean;
}

export function initialCatState(): CatState {
  return { arrived: false };
}

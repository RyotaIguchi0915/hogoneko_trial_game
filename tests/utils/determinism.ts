import { expect } from 'vitest';

/**
 * 再現性テストの枠組み（B4 G-3 / B5 SR-3 / DevConst ⑩）。
 *
 * 「同一入力なら常に同一結果」を検証する共通ユーティリティ。
 * produce は呼ぶたびに“新しい決定論的状態”を構築すること（RNG なら同一シードで作り直す）。
 *
 * @returns 1回目の結果（後続アサーションに使える）
 */
export function expectDeterministic<T>(produce: () => T, options: { runs?: number } = {}): T {
  const runs = Math.max(2, options.runs ?? 2);
  const first = produce();
  for (let i = 1; i < runs; i++) {
    expect(produce(), `run ${i + 1} が run 1 と一致しない（決定論性違反）`).toEqual(first);
  }
  return first;
}

/**
 * シードから結果を作る関数の再現性を検証する。
 * 同一シードで2回走らせ一致すること、別シードでは（通常）異なることを確認する。
 */
export function expectSeededDeterministic<T>(fromSeed: (seed: number) => T, seed = 0x1234_5678): T {
  return expectDeterministic(() => fromSeed(seed));
}

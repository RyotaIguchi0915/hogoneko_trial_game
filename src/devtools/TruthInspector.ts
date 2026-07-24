import type { TruthReader } from '@core/index';

/**
 * Truth Inspector — 開発ビルド限定の真実可視化（別層 / B4 §11.5 / EP-12）
 *
 * 観測境界（憲章 I-1）は「本番プレイヤーに真実=数値を見せない」ためのもの。
 * 開発時に真実を覗く経路は、本番から完全に除去されることを条件に許される（AD-53 回避）。
 *
 * 本モジュールは:
 *   - Presentation（L4）とは別の層に置く（L4→L2 依存を作らない）
 *   - 読み取り専用（状態を変更する API を持たない）
 *   - main.tsx の `import.meta.env.DEV` ガード + 動的 import により本番バンドルから除去される
 *
 * ⚠️ SENTINEL は「本番バンドルに混入していないか」を CI が grep で検証する目印。
 *    本番 dist に現れてはならない（.github/workflows/ci.yml の除去検証ステップ）。
 */
const SENTINEL = '[hogoneko-devtools:TruthInspector]';

export interface TruthInspector {
  /** 現在の真実を読み取り専用でダンプする。 */
  snapshot(): Readonly<Record<string, unknown>>;
  /** 目印付きの1行文字列。 */
  format(): string;
}

export function createTruthInspector(reader: TruthReader): TruthInspector {
  const snapshot = (): Readonly<Record<string, unknown>> => ({
    gamePhase: reader.getGamePhase(),
    progress: reader.getProgress(),
    cat: reader.getCatState(),
    rngState: reader.getRngState(),
  });
  return {
    snapshot,
    format: () => `${SENTINEL} ${JSON.stringify(snapshot())}`,
  };
}

/**
 * インスペクタを起動し、`globalThis.__hogonekoTruth` に読取専用ハンドルを置く。
 * 開発ビルドでのみ呼ばれる（本番では呼び出し側の DEV ガードで本モジュールごと除去）。
 */
export function mountTruthInspector(reader: TruthReader): TruthInspector {
  const inspector = createTruthInspector(reader);
  (globalThis as Record<string, unknown>).__hogonekoTruth = inspector;
  console.info(
    `${SENTINEL} mounted (DEV only). globalThis.__hogonekoTruth.format() で真実を確認できます。`,
  );
  return inspector;
}

import type { CatState } from './state/catState';
import type { CatProfile } from './state/catProfile';
import type { TimeState } from './time/TimeState';
import type { GamePhase } from './state/gamePhase';

/**
 * TruthReader — 真実（Cat State を含む）の読み取り専用インターフェース（L1 Core）
 *
 * ⚠️ 開発ビルド限定のデバッグ経路（B4 §11.5 / EP-12）でのみ使う。
 *    本番では呼び出し側（main.tsx）の import.meta.env.DEV ガードにより経路ごと除去される。
 * ⚠️ 実装（createTruthReader）は合成ルート（src/app）が提供する。devtools は本型のみを参照する。
 */
export interface TruthReader {
  getGamePhase(): GamePhase;
  getProgress(): TimeState;
  getCatState(): Readonly<CatState>;
  /** この子の隠れた素性（個体差・EP-4.01）。開発時に「seed で別の猫か」を確認するため。 */
  getCatProfile(): Readonly<CatProfile>;
  getRngState(): number;
}

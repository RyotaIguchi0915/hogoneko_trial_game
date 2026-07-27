import type { RestoreStatus, TrialPhase } from '@core/index';

/**
 * AppView — L4 の描画に渡す表示モデル（L4 Presentation）
 *
 * ⚠️ Cat State（真実）を含まない。observations は Phenomenon をローカライズ済みの文字列（数値なし・憲章 I-1）。
 * App / Scene / drawScene / bootstrap が共有するため独立モジュールに置く（循環 import 回避）。
 */
export interface AppView {
  readonly restoreStatus: RestoreStatus;
  readonly day: number;
  readonly segment: number;
  readonly segmentsPerDay: number;
  readonly phase: TrialPhase;
  /** 観測された現象の表示テキスト（Phenomenon をローカライズ済み・EP-2.10）。 */
  readonly observations: readonly string[];
}

import type { RestoreStatus, TrialPhase, GamePhase } from '@core/index';
import type { Decision, BondTier } from '@app/index';
import type { SpriteKey } from './sprites';

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
  /** 猫の姿勢スプライト（観測 descriptor 由来）。隠れ/不在なら null。数値ではない（憲章 I-1）。 */
  readonly catSprite: SpriteKey | null;
  /** アプリ全体フェーズ（物語アーク・EP-3.01）。title/playing/deciding/ending/epilogue/reflection で描き分ける。 */
  readonly gamePhase: GamePhase;
  /** 去就の決定（未決定は null・EP-3.08）。結末画面の出し分けに使う。 */
  readonly decision: Decision | null;
  /** 30日で育った絆のティア（trust 由来の質的カテゴリ・数値ではない・EP-3.08）。結末の出し分け用。 */
  readonly bondTier: BondTier;
  /** 現 Segment に残る行動枠（B2 §4）。介入 UI の可否に使う。0 なら介入不可（不在 or 使い切り）。 */
  readonly actionSlots: number;
  /**
   * 観察ノート（これまで見た事実・頻度順・ローカライズ済み・EP-2.07）。
   * Player Knowledge（観察履歴から再生成）の静かな提示。数値は「観測回数」であり Cat State ではない（I-1）。
   */
  readonly knowledgeNotes: readonly string[];
}

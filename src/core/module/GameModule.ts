/**
 * GameModule — モジュールのライフサイクル契約（L1 Core / B4 C-01）
 *
 * 各システムは GameModule として登録され、Game Manager が初期化順序を保証する。
 * Game Manager 自身はゲームロジックを持たない（統括のみ・AA-03/15 回避）。
 */
export interface GameModule {
  /** 一意な識別子（例: 'core.time'） */
  readonly id: string;
  /** 初期化（登録順に呼ばれる）。省略可 */
  init?(): void;
  /** 破棄（登録の逆順に呼ばれる）。省略可 */
  dispose?(): void;
}

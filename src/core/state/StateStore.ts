import { defineChannel, type EventBus } from '../events/EventBus';
import { canTransitionGamePhase, type GamePhase } from './gamePhase';
import { initialCatState, type CatState } from './catState';
import type { SimulationCapability } from './capability';

/**
 * State Store — 全状態の単一情報源（L1 Core / B4 C-03・§8）
 *
 * 原則（B4 §8.6）:
 *   SM-1 単一情報源  / SM-2 読取は不変・変更は明示API / SM-4 不正遷移を拒否
 *   SM-5 Cat State へのアクセスは L2 限定 / SM-7 変更は必ず通知を伴う
 *
 * ⚠️ 状態にロジックを持たせない（データのみ）。
 * ⚠️ 直接書き換え可能な参照を外部に渡さない。
 *
 * Sprint 1 では GamePhase と CatState を実装。Scene/Day/Player/Event State は Sprint 2。
 */

export const StateEvents = {
  gamePhaseChanged: defineChannel<{ readonly from: GamePhase; readonly to: GamePhase }>(
    'state/gamePhaseChanged',
  ),
} as const;

/**
 * 全層に安全な読み取りインターフェース。
 * ⚠️ Cat State を含まない。L4 Presentation はこの型で State Store を受け取る。
 */
export interface PresentationStateReader {
  getGamePhase(): GamePhase;
}

export class StateStore implements PresentationStateReader {
  readonly #bus: EventBus;
  #gamePhase: GamePhase;
  #catState: CatState;

  /**
   * @param initialPhase   セーブからの再構築時は保存済みフェーズを直接復元する（遷移検証は経ない）。
   * @param initialCatState セーブからの再構築用（B4 §9）。通常起動では初期値。
   */
  constructor(
    bus: EventBus,
    initialPhase: GamePhase = 'booting',
    initialCatState: CatState = initialCatState(),
  ) {
    this.#bus = bus;
    this.#gamePhase = initialPhase;
    this.#catState = initialCatState;
  }

  // --- Game Phase（全層可視） ---

  getGamePhase(): GamePhase {
    return this.#gamePhase;
  }

  /** フェーズ遷移。不正遷移は拒否し、成功時は変更を通知する（SM-4 / SM-7） */
  transitionGamePhase(to: GamePhase): void {
    const from = this.#gamePhase;
    if (!canTransitionGamePhase(from, to)) {
      throw new Error(`StateStore: invalid game phase transition "${from}" -> "${to}"`);
    }
    this.#gamePhase = to;
    this.#bus.emit(StateEvents.gamePhaseChanged, { from, to });
  }

  // --- Cat State（L2 限定・要 SimulationCapability・憲章 I-1 / SM-5） ---
  // 権限トークンは simulationAccess.ts のみが生成する。
  // L3/L4 は当該モジュールを import できないため、ここへ到達できない。

  getCatState(_capability: SimulationCapability): Readonly<CatState> {
    return this.#catState;
  }

  applyCatState(_capability: SimulationCapability, next: CatState): void {
    this.#catState = next;
  }
}

import type { GameModule } from '@core/module/GameModule';
import type { StateStore } from '@core/state/StateStore';
import { getSimulationStateAccess, type SimulationStateAccess } from '@core/state/simulationAccess';
import type { CatState } from '@core/state/catState';
import { updateCatSegment, type SegmentContext } from './segmentUpdate';

/**
 * Simulation System — L2 の真実を駆動する（L2 Simulation / B4 §8 / B5 §8）
 *
 * Cat State（真実）へのアクセスは L2 専用の SimulationStateAccess（権限トークン）経由でのみ行う
 * （憲章 I-1 の構造的保証）。L3/L4 は本システムにも simulationAccess にも到達できない。
 *
 * ⚠️ EP-2.01 の範囲: 1 Segment の内部状態推移（§8.1 step4-12 相当）を適用する。
 *    行動選択（Cat AI・step15）は EP-2.02、ループへの結線は EP-2.05 が担う。
 *    本システムを起動フローへ組み込むのは EP-2.05（合成ルートの層外への移設を伴う）。
 */
export class SimulationSystem implements GameModule {
  readonly id = 'sim.core';

  readonly #access: SimulationStateAccess;

  constructor(store: StateStore) {
    this.#access = getSimulationStateAccess(store);
  }

  /** 1 Segment 分、猫の真実を推移させ、更新後の状態を返す（診断用）。 */
  updateSegment(ctx: SegmentContext): CatState {
    const current = this.#access.getCatState();
    const next = updateCatSegment(current, ctx);
    this.#access.applyCatState(next);
    return next;
  }
}

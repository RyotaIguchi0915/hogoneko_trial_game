import type { StateStore } from './StateStore';
import type { CatState } from './catState';
import { SimulationCapability } from './capability';

/**
 * Simulation State Access — Cat State への L2 専用アクセス
 * （憲章 I-1 の構造的保証・B4 §8.1・SM-5）
 *
 * ⚠️ 本モジュールは L3 Perception / L4 Presentation から import 禁止
 *    （eslint import/no-restricted-paths）。
 *    これにより L3/L4 は権限トークンを取得できず、Cat State に到達できない。
 *
 * 使うのは L2 Simulation のシステムのみ。
 */

// 権限トークンの唯一の実体。ここでしか生成しない。
const CAPABILITY = new SimulationCapability();

export interface SimulationStateAccess {
  getCatState(): Readonly<CatState>;
  applyCatState(next: CatState): void;
}

export function getSimulationStateAccess(store: StateStore): SimulationStateAccess {
  return {
    getCatState: () => store.getCatState(CAPABILITY),
    applyCatState: (next) => store.applyCatState(CAPABILITY, next),
  };
}

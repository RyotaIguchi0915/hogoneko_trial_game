// 合成ルート（src/app・層外）— 公開 API
// ⚠️ L1 Core と L2 Simulation を組み立てる唯一の場所。L4 はここを不透明ハンドルとして使う。

export { GameRuntime } from './GameRuntime';
export type {
  RuntimeReader,
  GameRuntimeDeps,
  InterventionResult,
  Decision,
  BondTier,
} from './GameRuntime';

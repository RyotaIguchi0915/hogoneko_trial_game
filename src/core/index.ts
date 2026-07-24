// L1 Core — 公開 API の集約
// ⚠️ simulationAccess / capability はここから再輸出しない（L2 限定・憲章 I-1）。

export { createRng, restoreRng, type Rng, type RngStreamName } from './rng';

export {
  createEventBus,
  defineChannel,
  type EventBus,
  type EventChannel,
  type Subscription,
} from './events/EventBus';

export { GameManager } from './module/GameManager';
export type { GameModule } from './module/GameModule';

export {
  advanceSegment,
  initialTime,
  isInRoomSegment,
  DEFAULT_TRIAL_CONFIG,
  type TimeState,
  type TrialConfig,
  type TrialPhase,
  type TimeGranularity,
} from './time/TimeState';
export { TimeSystem, TimeEvents } from './time/TimeSystem';

export { StateStore, StateEvents, type PresentationStateReader } from './state/StateStore';
export {
  canTransitionGamePhase,
  allowedGamePhaseTransitions,
  type GamePhase,
} from './state/gamePhase';
export type { CatState } from './state/catState';

// --- Save（B4 ⑨ / EP-08） ---
// ⚠️ storage の具体（localStorage 等）は L4 が実装し、注入する。
export { SaveSystem, SaveEvents } from './save/SaveSystem';
export type {
  Clock,
  SaveResult,
  RestoreResult,
  RestoreStatus,
  SaveSystemOptions,
} from './save/SaveSystem';
export { createMemorySaveStorage } from './save/SaveStorage';
export type { SaveStorage } from './save/SaveStorage';
export {
  serialize,
  computeChecksum,
  validateStructure,
  verifyChecksum,
  migrate,
  CURRENT_SCHEMA_VERSION,
} from './save/SaveData';
export type { GameSnapshot, SaveData, SaveMeta } from './save/SaveData';

// --- Runtime（5層貫通の合成ルート / EP-14） ---
export { GameRuntime } from './runtime/GameRuntime';
export type { RuntimeReader, GameRuntimeDeps, TruthReader } from './runtime/GameRuntime';

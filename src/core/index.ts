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
// ⚠️ Needs/Affect/Relationship/Behavior の詳細型・initialCatState は L4 向けバレルに出さない。
//    L2 Simulation は '@core/state/catState' を直接参照する（憲章 I-1・値を L4 に露出しない）。

// 観察履歴（Persisted・Player Knowledge の再生成元）。数値を含まない Phenomenon 由来の記録（G-2）。
export { appendObservations, type ObservationEntry } from './state/observation';

// 痕跡（Persisted・不在 Segment の産物）。種別のみを持ち数値を含まない（憲章 I-1・EP-2.06）。
export { appendTraces, type Trace, type TraceKind } from './state/trace';

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

// --- 真実の読み取り面（開発ビルド限定・EP-12）。実装は合成ルート src/app。 ---
export type { TruthReader } from './truthReader';

// ⚠️ 合成ルート GameRuntime は src/app（層外）へ移設した（EP-2.05）。
//    L1 core は L2 Simulation を import できないため、L2 を駆動する合成は層外で行う。

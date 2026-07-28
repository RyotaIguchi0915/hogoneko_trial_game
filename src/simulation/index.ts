// L2 Simulation — 公開 API（真実層 🔒）
// ⚠️ この層は L3/L4 を import しない。数値(Truth)は Perception Gateway 経由でのみ越境する。

export { SimulationSystem } from './SimulationSystem';
export { updateCatSegment, type SegmentContext, type CatEnvironmentInput } from './segmentUpdate';
export { effectiveUrgency, clamp01, clamp, PROVISIONAL } from './catDynamics';
export { feedCat, INTERVENTION_PROVISIONAL } from './interventions';
export { traceForBehavior } from './trace';
export { dueEvents } from './eventSchedule';
export {
  selectZone,
  zoneUtility,
  ZONE_SELECTION_PROVISIONAL,
  type ZoneChoice,
} from './zoneSelection';
export {
  environmentEffect,
  combineDelta,
  EVENT_EFFECT_PROVISIONAL,
  type EnvironmentDelta,
} from './eventEffects';
export { EnvironmentSystem, type ZoneEnvironment } from './environment/EnvironmentSystem';
export {
  computeZoneAttributes,
  computeZoneSecurity,
  computeZoneComfort,
  exitScore,
  thermalFit,
  lightFit,
  ZONE_WEIGHTS,
} from './environment/zone';

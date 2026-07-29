// L2 Simulation — 公開 API（真実層 🔒）
// ⚠️ この層は L3/L4 を import しない。数値(Truth)は Perception Gateway 経由でのみ越境する。

export { SimulationSystem } from './SimulationSystem';
export { updateCatSegment, type SegmentContext, type CatEnvironmentInput } from './segmentUpdate';
export {
  effectiveUrgency,
  updateTrustDaily,
  needsDistress,
  clamp01,
  clamp,
  PROVISIONAL,
} from './catDynamics';
export { feedCat, INTERVENTION_PROVISIONAL } from './interventions';
export { traceForBehavior } from './trace';
export {
  rollStimulus,
  applyStimulusVigilance,
  stimulusSensitivity,
  STIMULUS_PROVISIONAL,
} from './stimulus';
export { generateCatProfile, BASE_PROFILES, PROFILE_JITTER } from './catProfile';
export { dueEvents } from './eventSchedule';
export {
  selectZone,
  zoneUtility,
  ZONE_SELECTION_PROVISIONAL,
  type ZoneChoice,
} from './zoneSelection';
export {
  environmentEffect,
  mergeAttrDelta,
  EVENT_EFFECT_PROVISIONAL,
  type EnvironmentChange,
  type ZoneAttributeDelta,
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

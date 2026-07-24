// L2 Simulation — 公開 API（真実層 🔒）
// ⚠️ この層は L3/L4 を import しない。数値(Truth)は Perception Gateway 経由でのみ越境する。

export { SimulationSystem } from './SimulationSystem';
export { updateCatSegment, type SegmentContext, type CatEnvironmentInput } from './segmentUpdate';
export { effectiveUrgency, clamp01, clamp, PROVISIONAL } from './catDynamics';

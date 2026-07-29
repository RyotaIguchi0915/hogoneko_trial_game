// L3 Perception — 公開 API（知覚層 👁️）
// ⚠️ 出力は Phenomenon のみ（数値を含まない）。真実は合成ルートから渡される（pull しない）。

export type { Phenomenon, PhenomenonSubject } from './Phenomenon';
export {
  toPhenomena,
  tracesToPhenomena,
  soundToPhenomena,
  timeToPhenomena,
  GATEWAY_DESCRIPTORS,
  type ObservationConditions,
} from './PerceptionGateway';

// Player Knowledge — 観察履歴から再生成される理解（G-2: Simulation 非依存・数値を持たない）。
export {
  derivePlayerKnowledge,
  type PlayerKnowledge,
  type ObservedPhenomenonSummary,
} from './PlayerKnowledge';

// 仮説 — プレイヤーが観察から推し量って持つもの（採点しない・真実を参照しない・G-2）。
export {
  HYPOTHESIS_TEMPLATES,
  availableHypotheses,
  isKnownHypothesis,
  type HypothesisTemplate,
} from './hypotheses';

// Insight — 立てた仮説が観察とどう噛み合っているか（EP-4.05）。
// ⚠️ 数値は L4 に出さない。効くのは描写解像度だけで、反証が優勢なら静かに戻る（責めない）。
export { deriveInsights, isDetailed, resolvedDescriptor, type Insight } from './insight';

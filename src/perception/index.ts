// L3 Perception — 公開 API（知覚層 👁️）
// ⚠️ 出力は Phenomenon のみ（数値を含まない）。真実は合成ルートから渡される（pull しない）。

export type { Phenomenon, PhenomenonSubject } from './Phenomenon';
export { toPhenomena, GATEWAY_DESCRIPTORS, type ObservationConditions } from './PerceptionGateway';

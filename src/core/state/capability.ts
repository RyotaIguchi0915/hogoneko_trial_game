/**
 * SimulationCapability — L2 Simulation 専用の権限トークン
 * （憲章 I-1 の構造的保証・B4 §8.1・SM-5）
 *
 * Cat State（猫の真実=数値）へのアクセスには本トークンが要る。
 * 実体は simulationAccess.ts のみが生成する。
 *
 * ⚠️ 本モジュールと simulationAccess.ts は L3 Perception / L4 Presentation から
 *    import 禁止（eslint import/no-restricted-paths で強制）。
 *    これにより L3/L4 はトークンを取得できず、Cat State に到達できない。
 */
export class SimulationCapability {}

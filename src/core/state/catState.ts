/**
 * Cat State — 猫の真実（L2 限定・憲章 I-1 / B4 §8.5 / B5 ②③⑤⑥）
 *
 * ⚠️ この型は L3 Perception / L4 Presentation に露出してはならない。
 *    Presentation が受け取れるのは Phenomenon（数値を含まない現象）のみ。
 *
 * 【EP-2.01 の範囲】
 *   Sprint 1 の最小形（`arrived`）から、Needs / Affect / Relationship / Behavior の
 *   **最小实体**へ拡張する。値・種別は B5 由来だが、完全な Needs 一覧・係数は
 *   監修（B5/B6 付録C）で確定する。本ファイルの数値は「仮値・監修待ち」である。
 *
 * ⚠️ 禁止語彙（好感度/懐き度 相当）を使わない。内部状態は Trust / Familiarity（B5 §5）。
 */

/**
 * Needs（欲求・B5 ②）。値は 0..1 の「圧（urgency）」。0=充足、1=切迫。
 * ⚠️ 最小セット。完全な Needs 一覧（N-01〜）は監修後に B5 §2.2 から充填する。
 */
export interface Needs {
  /** N-01 安全欲求（最上位・すべての他欲求をゲートする）。 */
  readonly safety: number;
  /** 生理欲求の代表（空腹）。 */
  readonly hunger: number;
  /** 維持欲求の代表（排泄）。 */
  readonly elimination: number;
}

/**
 * Affect（情動・B5 ③）。3次元 + 1蓄積。
 * 非対称: Vigilance は上昇即時/下降時間、StressLoad は上昇時間/下降日（B5 §3.2）。
 */
export interface Affect {
  /** A-1 Arousal（覚醒）0..1。 */
  readonly arousal: number;
  /** A-2 Valence（情動価）-1..+1（不快〜快）。 */
  readonly valence: number;
  /** A-3 Vigilance（警戒）0..1。 */
  readonly vigilance: number;
  /** A-4 StressLoad（蓄積ストレス）0..0.8（上限・B5 §3.2）。 */
  readonly stressLoad: number;
}

/**
 * Relationship（関係・B5 ⑤）。
 * Trust は数日で上昇・裏切りで即時低下（逆非対称）、Familiarity はほぼ不可逆に上昇。
 */
export interface Relationship {
  readonly trust: number;
  readonly familiarity: number;
}

/** Behavior（現在行動・B5 ⑥ / B6）。選択は Cat AI（EP-2.02）が担う。最小セット。 */
export type Behavior = 'resting' | 'exploring' | 'hiding' | 'eating' | 'grooming' | 'alert';

export interface CatState {
  /** 到着済みか（Day 0 の到着イベント後に true）。 */
  readonly arrived: boolean;
  readonly needs: Needs;
  readonly affect: Affect;
  readonly relationship: Relationship;
  readonly behavior: Behavior;
}

/**
 * トライアル開始時（到着直後）の状態。
 * ⚠️ 数値はすべて仮値（監修待ち・B5/B6 付録C）。到着直後は警戒が高く隠れがち、という方向のみ妥当。
 */
export function initialCatState(): CatState {
  return {
    arrived: false,
    needs: { safety: 0.6, hunger: 0.2, elimination: 0.2 },
    affect: { arousal: 0.3, valence: -0.2, vigilance: 0.5, stressLoad: 0.2 },
    relationship: { trust: 0.05, familiarity: 0.0 },
    behavior: 'hiding',
  };
}

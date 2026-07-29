import type { Rng } from '@core/index';
import type { CatProfile } from '@core/state/catProfile';
import { clamp01 } from './catDynamics';

/**
 * Cat Profile 生成 — seed から「この子」を1個体つくる（L2 Simulation / docs/04 §9.4・docs/18 B-A）
 *
 * ⚠️ **完全なランダム生成をしない**（`docs/04:1910`）。デザイナー作成のベース個体を選び、微小変動を加える。
 *    理由: ランダム個体は「学べる（＝仮説が成立する）」保証がない（`docs/04:1921`）。
 * ⚠️ 決定論: profile ストリーム（seed 由来・消費位置に非依存）から生成する。同一 seed は常に同一個体。
 * ⚠️ ベース個体の値・軸は**仮値（監修待ち）**。正は `docs/05:815` の 24 タイプ。ここは MVP の抜粋 5 個体。
 *    タイプ名（下のコメント）は L4 に出さない（憲章 I-1）。
 */

/** MVP のベース個体（監修待ち・`docs/05:815` 24 タイプの抜粋）。4 軸 = [神経質/遮蔽/高所/社会性]。 */
export const BASE_PROFILES: readonly CatProfile[] = [
  // 慎重観察型: 神経質・隠れ好き・やや高所・人にはまだ遠慮
  { neuroticism: 0.75, coverSeeking: 0.7, heightSeeking: 0.6, sociability: 0.3 },
  // 物怖じしない甘えん坊: 動じにくく・開けた場所・低め・人を求める
  { neuroticism: 0.25, coverSeeking: 0.3, heightSeeking: 0.4, sociability: 0.8 },
  // 高所の見張り番: ふつう・やや開放・高所が大好き・ほどほど社交
  { neuroticism: 0.5, coverSeeking: 0.45, heightSeeking: 0.85, sociability: 0.45 },
  // 内弁慶: 神経質・隠れが大好き・低め・人にはゆっくり
  { neuroticism: 0.7, coverSeeking: 0.85, heightSeeking: 0.3, sociability: 0.4 },
  // おっとりマイペース: 動じにくく・ふつう・ふつう・ほどほど社交
  { neuroticism: 0.3, coverSeeking: 0.5, heightSeeking: 0.5, sociability: 0.55 },
];

/** ベースからの微小変動幅（±JITTER）。同型の兄弟でも少しずつ違う、程度に留める。 */
export const PROFILE_JITTER = 0.08;

/**
 * profile ストリームの RNG から 1 個体を生成する（ベース選択 → 各軸に微小変動）。純粋・決定論。
 * @param rng `rootRng.fork('profile')` を渡す（seed 由来・復元後も同一個体）。
 */
export function generateCatProfile(rng: Rng): CatProfile {
  const base = BASE_PROFILES[rng.int(0, BASE_PROFILES.length)]!;
  const jitter = (v: number): number => clamp01(v + (rng.next() * 2 - 1) * PROFILE_JITTER);
  return {
    neuroticism: jitter(base.neuroticism),
    coverSeeking: jitter(base.coverSeeking),
    heightSeeking: jitter(base.heightSeeking),
    sociability: jitter(base.sociability),
  };
}

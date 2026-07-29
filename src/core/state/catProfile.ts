/**
 * CatProfile — 猫の隠れた素性（個体差・L2 限定の真実 / 憲章 I-1 / docs/04 §9・docs/18 B-A）
 *
 * この子が「どんな猫か」を決める、**プレイ中は不変**のパラメータ。状態（Needs/Affect/Relationship）が
 * 可変なのに対し、Profile は素性であり変わらない（`docs/01:352`「変わるのは、それを読むプレイヤーの目」）。
 * ⚠️ この型は L3/L4 に露出してはならない。数値もタイプ名も L4 に出さない（憲章 I-1 / `docs/05:777`）。
 *    ゆえに L4 向けバレル `@core/index` からは再輸出しない（CatState と同じ扱い）。L2/合成ルートが直接 import する。
 * ⚠️ MVP は 8 軸（T-1〜T-8・`docs/04:1877`）のうち「観察で読めて／仮説にでき／環境で応えられる」4 軸に絞る。
 *    残り4軸（活動/探索/順応/回復）は後続で開く。値はすべて 0..1・中立的特性（「良い/悪い気質」は無い・`docs/04:1892`）。
 */
export interface CatProfile {
  /** T-1 神経質さ（0=動じない〜1=些細な刺激に反応）。突発音への警戒反応・警戒 baseline に効く。 */
  readonly neuroticism: number;
  /** T-7 遮蔽選好（0=開放好み〜1=隠れ好み）。refuge 型 Zone への選好。 */
  readonly coverSeeking: number;
  /** T-6 高所選好（0=床好み〜1=高所好み）。vantage 型 Zone への選好。 */
  readonly heightSeeking: number;
  /** T-2 社会性（0=単独志向〜1=人を求める）。信頼・慣れの育ちやすさ。 */
  readonly sociability: number;
}

/**
 * 中立個体（全軸 0.5）。既定・後方互換・テスト用。
 * ⚠️ 各配線は「(軸 − 0.5)」や「0.5 + 軸」で効かせ、0.5 のとき効果ゼロ（＝中立）になるよう設計する。
 */
export const NEUTRAL_PROFILE: CatProfile = {
  neuroticism: 0.5,
  coverSeeking: 0.5,
  heightSeeking: 0.5,
  sociability: 0.5,
};

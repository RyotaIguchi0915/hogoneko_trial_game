import type { PlayerKnowledge } from './PlayerKnowledge';

/**
 * 仮説システム — プレイヤーが**推し量って持つ**もの（L3 Perception / docs/06 §仮説 / docs/18 B-C）
 *
 * ⚠️ G-2（観測境界）: このモジュールは Simulation（真実）を import しない。
 *    仮説の可否は**観察履歴だけ**から決まる。正解と照合しない——というより、**正解を知らない**。
 * ⚠️ **採点しない**（docs/06:616）。合っている／間違っているを一切示さない。
 *    唯一の支援は「描写解像度」（docs/06:681）で、その判定は insight.ts が担う。
 * ⚠️ 確信度・理解段階は数値として L4 に出さない（憲章 I-1）。
 */

export interface HypothesisTemplate {
  /** 仮説ID（表示文言は labelKey として L4 が Localization で解決する）。 */
  readonly id: string;
  /**
   * この仮説を立てるために**観測していなければならない**現象（docs/06:660）。
   * 「観測していないものは材料にならない」——見ていない相手について推し量ることはできない。
   */
  readonly requires: readonly string[];
  /**
   * この仮説を持つと観察文が詳しくなる現象（docs/06:681 描写解像度）。
   * ⚠️ 正誤とは無関係。仮説が外れていても、その現象への描写は詳しくなる。
   */
  readonly detailFor: readonly string[];
  /**
   * この仮説に**沿う**観測（docs/06:126「反復＋対比＝仮説」の反復側・EP-4.05）。
   * ⚠️ 「正解」ではない。観察がそう並んだ、というだけのこと。
   */
  readonly supportedBy: readonly string[];
  /**
   * この仮説に**沿わない**観測（同・対比側）。支持と両方が揃って初めて対比観測が成立する。
   */
  readonly contrastedBy: readonly string[];
  /**
   * この現象が同じ Segment にあるときだけ支持／反証を数える（引き金つきの仮説・EP-4.05）。
   * 例: 「物音が苦手そう」は**物音がした Segment**の振る舞いだけが材料になる。
   */
  readonly conditionedOn?: string;
}

/**
 * MVP の仮説テンプレ（監修待ち: 文言の語調は推量形・docs/18 §6）。
 * ⚠️ CatProfile の4軸（神経質さ／高所選好／遮蔽選好／社会性）に対応させてあるが、
 *    **プレイヤーには軸の存在を見せない**。あくまで「見たことから推し量った言葉」として並ぶ。
 */
export const HYPOTHESIS_TEMPLATES: readonly HypothesisTemplate[] = [
  {
    // T-1 神経質さ: 物音を観測していなければ、音について推し量りようがない。
    id: 'hypothesis.noise_sensitive',
    requires: ['phenomenon.sudden_noise'],
    detailFor: ['phenomenon.sudden_noise'],
    // ⚠️ 音がした Segment に限って「その時どうしていたか」を材料にする。
    conditionedOn: 'phenomenon.sudden_noise',
    supportedBy: ['phenomenon.out_of_sight', 'phenomenon.ears_orienting'],
    contrastedBy: ['phenomenon.curled_resting', 'phenomenon.self_grooming'],
  },
  {
    // T-6 高所選好
    id: 'hypothesis.likes_height',
    requires: ['phenomenon.at_vantage'],
    detailFor: ['phenomenon.at_vantage'],
    supportedBy: ['phenomenon.at_vantage'],
    contrastedBy: ['phenomenon.at_refuge', 'phenomenon.at_open_floor'],
  },
  {
    // T-7 遮蔽選好
    id: 'hypothesis.likes_cover',
    requires: ['phenomenon.at_refuge'],
    detailFor: ['phenomenon.at_refuge'],
    supportedBy: ['phenomenon.at_refuge'],
    contrastedBy: ['phenomenon.at_vantage', 'phenomenon.at_open_floor'],
  },
  {
    // T-2 社会性: 人に最も近い Zone に居るのを見たときだけ立てられる。
    id: 'hypothesis.comes_close',
    requires: ['phenomenon.at_open_floor'],
    detailFor: ['phenomenon.at_open_floor'],
    supportedBy: ['phenomenon.at_open_floor'],
    contrastedBy: ['phenomenon.at_refuge', 'phenomenon.at_vantage'],
  },
];

/** 既知のテンプレIDか（不正な保存データを静かに捨てるための判定）。 */
export function isKnownHypothesis(id: string): boolean {
  return HYPOTHESIS_TEMPLATES.some((t) => t.id === id);
}

/**
 * いま立てられる仮説（純粋・決定論）。
 *
 * 観察履歴に必要な現象が現れていない仮説は**選択肢に出さない**（docs/06:660）。
 * ⚠️ これは難易度調整ではなく観測境界そのもの。見ていないことについては、推し量る言葉すら持てない。
 * 並びはテンプレ定義順で安定（G-3）。
 */
export function availableHypotheses(knowledge: PlayerKnowledge): readonly string[] {
  const seen = new Set(knowledge.observed.map((o) => o.descriptor));
  return HYPOTHESIS_TEMPLATES.filter((t) => t.requires.every((r) => seen.has(r))).map((t) => t.id);
}

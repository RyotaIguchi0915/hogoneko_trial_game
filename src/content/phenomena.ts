/**
 * 現象語彙の最小セット（実データ / B4 P-02 / B11 §6）
 *
 * 2026-07-24 人間承認済みの最小セット（EP-2.04）。⚠️ 文言（labelKey が指す表示）は
 * 「観測可能な事実」のみ。猫の内面の解釈（「怖がっている」等）を書かない（B4 P-01 禁止）。
 * ⚠️ 実コンテンツ・多段解像度・監修は Content 工程。ここは MVP の最小語彙。
 */

/** direct=在室で猫の行動として観測 / indirect=痕跡・環境 / sound=音。 */
export const PHENOMENON_CONTENT: readonly unknown[] = [
  // direct（猫の行動・観測可能な事実）
  { id: 'phenomenon.curled_resting', channel: 'direct', labelKey: 'phenomenon.curled_resting' },
  { id: 'phenomenon.out_of_sight', channel: 'direct', labelKey: 'phenomenon.out_of_sight' },
  { id: 'phenomenon.ears_orienting', channel: 'direct', labelKey: 'phenomenon.ears_orienting' },
  { id: 'phenomenon.roaming', channel: 'direct', labelKey: 'phenomenon.roaming' },
  { id: 'phenomenon.at_food', channel: 'direct', labelKey: 'phenomenon.at_food' },
  { id: 'phenomenon.self_grooming', channel: 'direct', labelKey: 'phenomenon.self_grooming' },
  // sound（環境音・突発刺激・EP-4.02）— 聞こえた事実。猫の反応と並べて因果を読ませる。
  { id: 'phenomenon.sudden_noise', channel: 'sound', labelKey: 'phenomenon.sudden_noise' },
  // indirect（痕跡・不在 Segment の産物・EP-2.06）
  { id: 'phenomenon.shed_fur', channel: 'indirect', labelKey: 'phenomenon.shed_fur' },
  { id: 'phenomenon.moved_object', channel: 'indirect', labelKey: 'phenomenon.moved_object' },
  { id: 'phenomenon.food_reduced', channel: 'indirect', labelKey: 'phenomenon.food_reduced' },
  { id: 'phenomenon.warm_hollow', channel: 'indirect', labelKey: 'phenomenon.warm_hollow' },
];

export const QUALIFIER_CONTENT: readonly unknown[] = [
  { id: 'qualifier.briefly', labelKey: 'qualifier.briefly' },
  { id: 'qualifier.repeatedly', labelKey: 'qualifier.repeatedly' },
  { id: 'qualifier.faintly', labelKey: 'qualifier.faintly' },
];

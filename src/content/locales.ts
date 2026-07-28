import type { LocalizationDictionary } from '@data/index';

/**
 * ローカライズ辞書（実データ / B10 D-02 / B11 §4）
 *
 * ⚠️ 現象語彙の文言は「観測可能な事実」のみ。猫の内面の解釈（「怖がっている」等）を書かない（B4 P-01）。
 * ⚠️ 数値をテキストに整形しない（憲章 I-1）。
 * ⚠️ MVP の最小辞書。実文言・多言語・監修は Content 工程。
 */
export const LOCALES: LocalizationDictionary = {
  ja: {
    // 現象語彙（descriptor）— 見えた事実だけを言う
    'phenomenon.curled_resting': '丸くなって休んでいる',
    'phenomenon.out_of_sight': '姿が見当たらない',
    'phenomenon.ears_orienting': '耳を動かし、じっとしている',
    'phenomenon.roaming': '部屋を歩き回っている',
    'phenomenon.at_food': '食器のところにいる',
    'phenomenon.self_grooming': '毛づくろいをしている',
    'phenomenon.shed_fur': '毛が落ちている',
    'phenomenon.moved_object': '物の位置が変わっている',
    'phenomenon.food_reduced': 'ごはんが減っている',
    'phenomenon.warm_hollow': 'クッションにくぼみが残っている',
  },
};

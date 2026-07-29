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
    // 環境音（突発刺激・EP-4.02）— 聞こえた事実だけを言う（解釈しない）
    'phenomenon.sudden_noise': 'どこかで物音がした',
    // 場所（文脈つき観察・EP-4.02b）— どこにいるかの事実だけ。「落ち着いている」等の解釈は書かない
    'phenomenon.at_refuge': '部屋のすみにいる',
    'phenomenon.at_vantage': '高いところにいる',
    'phenomenon.at_open_floor': '部屋のまんなかにいる',
    'phenomenon.shed_fur': '毛が落ちている',
    'phenomenon.moved_object': '物の位置が変わっている',
    'phenomenon.food_reduced': 'ごはんが減っている',
    'phenomenon.warm_hollow': 'クッションにくぼみが残っている',

    // --- 描写解像度（EP-4.03 / docs/06:681）---
    // 仮説を立てると、その仮説に関わる現象の観察文が「詳しい版」に替わる。
    // ⚠️ 正誤の合図ではない（**外れた仮説でも詳しくなる**）。上がるのは見えた事実の**解像度**だけで、
    //    解釈（「落ち着いている」「安心した」等）は決して足さない（B4 P-01）。
    'phenomenon.sudden_noise.detailed': 'どこかで物音がした。小さな、乾いた音だった',
    'phenomenon.at_refuge.detailed': '部屋のすみにいる。壁ぎわの、光の届かないあたり',
    'phenomenon.at_vantage.detailed': '高いところにいる。ここからは、背中だけが見える',
    'phenomenon.at_open_floor.detailed': '部屋のまんなかにいる。こちらからは、全身がよく見える',

    // --- 仮説（EP-4.03 / docs/18 B-C）---
    // ⚠️ すべて**推量形**。断定しない。正誤は示さない（採点しない・docs/06:616）。
    //    これはプレイヤー自身の言葉であって、猫についての正解ではない。
    'hypothesis.noise_sensitive': 'この子は、物音が苦手そう',
    'hypothesis.likes_height': '高いところが、落ち着くのかもしれない',
    'hypothesis.likes_cover': '隠れられる場所を、好むみたい',
    'hypothesis.comes_close': 'そばに来てくれることも、あるみたい',
  },
};

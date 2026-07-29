/**
 * Sprites — プレースホルダの絵（L4 Presentation / EP-2.10 サンプル画像パイプライン）
 *
 * ⚠️ プログラマ・アートのプレースホルダ。本番の絵柄・アセット仕様は **OI-6 Art Direction Bible（docs/16）**。
 *    絵柄の方針は「**形はポップに、色は静かに、姿勢は正直に**」（docs/16 §1.6）。
 *    旧方針「静かな観察画（抑制された写実）」は docs/16 の発効をもって失効した（同 §1.6 の裁定）。
 *    本番は Appearance（7レイヤ）× Pose の SVG 合成へ置き換える（docs/16 §4 / §9 A-5）。
 * ⚠️ 姿勢は現象語彙（descriptor）と 1:1 で対応させる。感情ラベルではなく**観測可能な姿勢**（B4 P-01）。
 *    「**顔で語らない、体で語る**」（docs/16 §3.3）——表情で心情を示さない。区別は**シルエット**でつける。
 *    プレースホルダでも姿勢が読めることが要件: 姿勢は装飾ではなく**推論の材料**そのもの（docs/16 §3.1）。
 * ⚠️ 自作 SVG のみ（外部・著作権画像は不使用）。自己完結の data URI で保持。
 */

/** 猫の色（docs/16 §2.1 の cat トークン）。温かいベージュ。プレースホルダは単色で塗る。 */
const CAT_FILL = '#c2a488';

// 座り猫（既定・上体を起こす）: 姿勢が特定できない現象の汎用
const CAT_SITTING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${CAT_FILL}">
<path d="M74 80 q22 -3 15 -26 q-1 14 -17 16 z"/>
<ellipse cx="50" cy="72" rx="26" ry="22"/>
<circle cx="50" cy="44" r="18"/>
<polygon points="35,32 30,10 49,26"/>
<polygon points="65,32 70,10 51,26"/>
</g></svg>`;

// 丸くなって休む（curled_resting）: 低く丸い塊＋頭を寄せる
const CAT_CURLED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${CAT_FILL}">
<ellipse cx="52" cy="66" rx="36" ry="21"/>
<circle cx="26" cy="60" r="14"/>
<polygon points="17,50 12,35 28,49"/>
</g></svg>`;

// 歩く（roaming）: 横長の体＋脚＋頭を横に
const CAT_WALKING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${CAT_FILL}">
<path d="M20 56 q-15 -6 -9 -21 q-3 12 9 16 z"/>
<ellipse cx="50" cy="56" rx="30" ry="14"/>
<circle cx="78" cy="50" r="12"/>
<polygon points="72,42 70,27 82,41"/>
<polygon points="86,42 89,28 78,40"/>
<rect x="32" y="68" width="5" height="17"/>
<rect x="45" y="68" width="5" height="17"/>
<rect x="60" y="68" width="5" height="17"/>
<rect x="71" y="68" width="5" height="17"/>
</g></svg>`;

// 耳を動かし、じっとしている（ears_orienting）: 座位のまま**耳だけ**が他方へ向く。
//   ⚠️ 体も視線も動かさない。驚き・緊張の記号を足さない（docs/16 §4.4）。首がわずかに伸びるのみ。
const CAT_ALERT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${CAT_FILL}">
<path d="M74 80 q22 -3 15 -26 q-1 14 -17 16 z"/>
<ellipse cx="50" cy="73" rx="26" ry="21"/>
<circle cx="50" cy="42" r="18"/>
<polygon points="34,31 21,16 46,25"/>
<polygon points="64,29 53,11 50,28"/>
</g></svg>`;

// 食器のところにいる（at_food）: 前傾して頭が下がる。
//   ⚠️ 「食べている」とは限らない——食器の前にいる姿勢だけを描く（解釈しない・B4 P-01）。
const CAT_EATING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${CAT_FILL}">
<path d="M80 66 q19 -6 12 -25 q0 13 -15 15 z"/>
<ellipse cx="58" cy="70" rx="24" ry="19"/>
<circle cx="31" cy="74" r="15"/>
<polygon points="19,65 12,49 30,60"/>
<polygon points="37,61 43,45 45,62"/>
</g></svg>`;

// 毛づくろいをしている（self_grooming）: 体を折り、後脚を上げる。
//   後脚が縦に伸びるシルエットが、座位・前傾のいずれとも区別できる決め手（docs/16 §3.1 検品）。
const CAT_GROOMING = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${CAT_FILL}">
<path d="M78 84 q18 -8 10 -24 q1 11 -13 15 z"/>
<ellipse cx="52" cy="76" rx="27" ry="18"/>
<path d="M64 62 q9 -20 3 -32 q11 13 3 34 z"/>
<circle cx="40" cy="56" r="15"/>
<polygon points="28,48 24,32 42,44"/>
<polygon points="50,46 56,31 54,48"/>
</g></svg>`;

export type SpriteKey =
  'cat_sitting' | 'cat_curled' | 'cat_walking' | 'cat_alert' | 'cat_eating' | 'cat_grooming';

function dataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const SPRITES: Readonly<Record<SpriteKey, string>> = {
  cat_sitting: dataUri(CAT_SITTING),
  cat_curled: dataUri(CAT_CURLED),
  cat_walking: dataUri(CAT_WALKING),
  cat_alert: dataUri(CAT_ALERT),
  cat_eating: dataUri(CAT_EATING),
  cat_grooming: dataUri(CAT_GROOMING),
};

export const SPRITE_KEYS = Object.keys(SPRITES) as SpriteKey[];

/**
 * 現象語彙（descriptor）→ 猫の姿勢スプライト。
 *
 * 猫の直接観測 6 語彙のうち、out_of_sight（隠れ/不在）は描かない（null）。
 * 残る 5 つは**それぞれ別の姿勢**を持つ（EP-4.02c / docs/16 §9 A-2）。
 * ⚠️ ここが 1 つでも同じ絵に潰れると、観察文が違っても絵が同じになり、
 *    「〈場所〉で〈行動〉」の文脈（EP-4.02b）が絵の側で失われる。
 * ⚠️ 姿勢の対応は暫定（本番の作り分けは OI-6 / docs/16 §4.4 のポーズ表）。
 */
export function spriteForDescriptor(descriptor: string | undefined): SpriteKey | null {
  switch (descriptor) {
    case undefined:
    case 'phenomenon.out_of_sight':
      return null;
    case 'phenomenon.curled_resting':
      return 'cat_curled';
    case 'phenomenon.roaming':
      return 'cat_walking';
    case 'phenomenon.ears_orienting':
      return 'cat_alert';
    case 'phenomenon.at_food':
      return 'cat_eating';
    case 'phenomenon.self_grooming':
      return 'cat_grooming';
    default:
      return 'cat_sitting';
  }
}

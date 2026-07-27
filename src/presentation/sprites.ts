/**
 * Sprites — プレースホルダの絵（L4 Presentation / EP-2.10 サンプル画像パイプライン）
 *
 * ⚠️ プログラマ・アートのプレースホルダ。本番の絵柄・アセット仕様は OI-6（Art Direction Bible・docs/16）。
 *    作業方針は「静かな観察画」（低彩度・自然光・抑制された写実）。data URI を実アセットに差し替えれば本番に載る。
 * ⚠️ 姿勢は現象語彙（descriptor）に対応させる。感情ラベルではなく**観測可能な姿勢**（B4 P-01 / §9.6）。
 * ⚠️ 自作 SVG のみ（外部・著作権画像は不使用）。自己完結の data URI で保持。
 */

const CAT_FILL = '#8a8177';

// 座り猫（既定・上体を起こす）: ears_orienting / self_grooming / at_food の汎用
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

export type SpriteKey = 'cat_sitting' | 'cat_curled' | 'cat_walking';

function dataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const SPRITES: Readonly<Record<SpriteKey, string>> = {
  cat_sitting: dataUri(CAT_SITTING),
  cat_curled: dataUri(CAT_CURLED),
  cat_walking: dataUri(CAT_WALKING),
};

export const SPRITE_KEYS = Object.keys(SPRITES) as SpriteKey[];

/**
 * 現象語彙（descriptor）→ 猫の姿勢スプライト。
 * out_of_sight（隠れ/不在）は null（描かない）。未知/その他は汎用の座り姿勢。
 * ⚠️ 姿勢の対応は暫定（監修・OI-6 で確定）。行動別ポーズの拡充は今後。
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
    default:
      return 'cat_sitting';
  }
}

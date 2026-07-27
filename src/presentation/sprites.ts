/**
 * Sprites — プレースホルダの絵（L4 Presentation / EP-2.10 サンプル画像パイプライン）
 *
 * ⚠️ プログラマ・アートのプレースホルダ。本番の絵柄・アセット仕様は OI-6（Art Bible）＝人間ドメイン。
 *    ここは「画像アセットを読み込んで Canvas に drawImage する仕組み」を実証するための仮素材。
 *    OI-6 確定後、この data URI を実アセット（PNG/SVG）へ差し替えるだけで本番に載る。
 * ⚠️ 自作の SVG のみ（外部・著作権のある画像は使わない）。自己完結の data URI で持つ。
 * ⚠️ ポーズは1種のみ（座り猫）。行動別ポーズの出し分けは OI-6 / 今後の拡張。
 */

// 座り猫のシルエット（基本図形で構成した簡易プレースホルダ）。色は drawScene と揃える。
const CAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<g fill="#8a8177">
<path d="M74 80 q22 -3 15 -26 q-1 14 -17 16 z"/>
<ellipse cx="50" cy="72" rx="26" ry="22"/>
<circle cx="50" cy="44" r="18"/>
<polygon points="35,32 30,10 49,26"/>
<polygon points="65,32 70,10 51,26"/>
</g>
</svg>`;

export type SpriteKey = 'cat';

export const SPRITES: Readonly<Record<SpriteKey, string>> = {
  cat: `data:image/svg+xml,${encodeURIComponent(CAT_SVG)}`,
};

export const SPRITE_KEYS = Object.keys(SPRITES) as SpriteKey[];

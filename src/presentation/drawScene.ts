import type { AppView } from './appView';
import type { SpriteKey } from './sprites';

/** 読み込み済みスプライト（Scene が渡す）。未読込のキーは省略され、幾何プレースホルダにフォールバック。 */
export type SpriteImages = Partial<Record<SpriteKey, CanvasImageSource>>;

/**
 * drawScene — シーンの Canvas 2D 描画（L4 Presentation / ADR-001 / B4 L4）
 *
 * ⚠️ 本番のアート・レイアウトは OI-6（Art Bible）/ OI-4（UI/UX）＝人間ドメイン。
 *    ここは「Canvas 2D レンダリング基盤の確立」と、静かなプレースホルダ描画に留める
 *    （プログラマ・ジオメトリ。絵柄は後日 OI-6 で確定）。
 * ⚠️ 描画入力は AppView（Phenomenon をローカライズ済みの文字列など・数値なし）。Cat State に触れない（憲章 I-1）。
 * ⚠️ トーンは静か（Pillar 6）。派手な演出を持たない。
 *
 * この関数は副作用（ctx への描画）のみを持つ薄い手続き。分岐は最小限にしテスト可能に保つ。
 */

/** 描画に必要な最小の 2D コンテキスト面（テストでスタブ可能にするため型を絞る）。 */
export type Scene2D = Pick<
  CanvasRenderingContext2D,
  | 'clearRect'
  | 'fillRect'
  | 'strokeRect'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'stroke'
  | 'ellipse'
  | 'fill'
  | 'fillText'
  | 'drawImage'
> & {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
};

const COLORS = {
  bg: '#f4f2ee',
  roomStroke: '#c9c4bc',
  floor: '#e9e5df',
  furniture: '#d8d2c8',
  cat: '#8a8177',
  text: '#4a4a4a',
} as const;

/**
 * 論理サイズ (width×height, CSS px) に対してシーンを描く。
 * DPR スケールは呼び出し側（Scene.tsx）が ctx に適用済みである前提。
 */
export function drawScene(
  ctx: Scene2D,
  view: AppView,
  width: number,
  height: number,
  sprites: SpriteImages = {},
): void {
  ctx.clearRect(0, 0, width, height);

  // 背景
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  // 部屋の枠（構図固定・B3 ③: 毎回同じ画。変わるのは中身だけ）
  const margin = Math.min(width, height) * 0.12;
  const roomX = margin;
  const roomY = margin;
  const roomW = width - margin * 2;
  const roomH = height - margin * 2;

  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(roomX, roomY, roomW, roomH);
  ctx.strokeStyle = COLORS.roomStroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(roomX, roomY, roomW, roomH);

  // 隠れ場所（refuge の家具・プレースホルダ）: 右下の箱
  const boxW = roomW * 0.24;
  const boxH = roomH * 0.22;
  const boxX = roomX + roomW - boxW - roomW * 0.08;
  const boxY = roomY + roomH - boxH - roomH * 0.08;
  ctx.fillStyle = COLORS.furniture;
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // 猫: 観察可能な姿勢（catSprite）があるときだけ、部屋の中央にそっと置く。
  //   catSprite=null（隠れ/不在）なら描かない。位置は Cat の location 未実装のため暫定中央。
  //   対応スプライト画像が読込済みなら drawImage、未読込なら楕円プレースホルダにフォールバック。
  if (view.catSprite) {
    const cx = roomX + roomW * 0.42;
    const cy = roomY + roomH * 0.5;
    const image = sprites[view.catSprite];
    if (image) {
      const size = Math.min(roomW, roomH) * 0.42;
      ctx.drawImage(image, cx - size / 2, cy - size / 2, size, size);
    } else {
      ctx.fillStyle = COLORS.cat;
      ctx.beginPath();
      ctx.ellipse(cx, cy + roomH * 0.05, roomW * 0.1, roomH * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 観察テキスト（見えた事実のみ）。アクセシブルな本文は App の caption 側にも持つ。
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '16px system-ui, sans-serif';
  const line = view.observations[0] ?? '…';
  ctx.fillText(line, width / 2, roomY + roomH + margin * 0.5);
}

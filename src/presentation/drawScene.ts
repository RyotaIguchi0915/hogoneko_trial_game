import type { AppView } from './appView';
import type { SpriteKey } from './sprites';
import { type SceneColors, SCENE_LIGHT } from './theme';

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

/** 部屋矩形に対する相対位置（0..1）。座標系は docs/16a §6.2 の構図に対応する。 */
interface RelPoint {
  readonly x: number;
  readonly y: number;
}
interface RelRect extends RelPoint {
  readonly w: number;
  readonly h: number;
}

/**
 * 観測された場所（descriptor）→ 部屋の中の猫の位置（EP-4.02b / docs/16 §9 A-3）。
 *
 * ⚠️ 値は docs/16a §6.2 の構図座標に対応する（本番背景の導入時はそのまま canvas 正規化座標になる）。
 * ⚠️ **Zone の属性と絵の位置が一致していることが要件**（docs/16 §6.2）。vantage は明るく高い所、
 *    refuge は人から遠い暗いすみ、open_floor は手前の人に近い床。ここがずれると観察が矛盾し、
 *    プレイヤーは「文と絵のどちらを信じるか」を失う。
 */
export const PLACE_POSITIONS: Readonly<Record<string, RelPoint>> = {
  'phenomenon.at_vantage': { x: 0.48, y: 0.3 }, // 窓の右隣・高い所（lightLevel 最大）
  'phenomenon.at_refuge': { x: 0.83, y: 0.68 }, // 右奥のすみ（暗く・人から最も遠い）
  'phenomenon.at_open_floor': { x: 0.33, y: 0.82 }, // 手前まんなかの床（人に最も近い）
};

/** 場所が観測できないとき（未知の Zone 等）の既定位置。 */
const DEFAULT_POSITION: RelPoint = { x: 0.42, y: 0.5 };

/**
 * プレイヤーが置いたもの（EP-4.04 の placements）→ 部屋の中の家具の位置。
 * 置いたことが**絵に出る**ことで、働きかけに手応えが生まれる（docs/16 §5.3）。
 * ⚠️ 猫がそれを使うかは個体次第（憲章 I-2）。ここは「置いた」事実だけを描き、効果を示唆しない。
 */
const PLACEMENT_RECTS: Readonly<Record<string, RelRect>> = {
  high_perch: { x: 0.38, y: 0.2, w: 0.2, h: 0.3 }, // 高い台（zone.vantage）
  hiding_place: { x: 0.72, y: 0.52, w: 0.22, h: 0.26 }, // 隠れ家（zone.refuge）
  // ごはんを静かな隅へ（zone.open_floor の端）。移した先に食器が現れる（EP-4.04b）。
  quiet_food: { x: 0.16, y: 0.62, w: 0.1, h: 0.06 },
};

/** 据え置きのクッション（zone.open_floor・content 定義で最初から在る）。 */
const CUSHION_RECT: RelRect = { x: 0.2, y: 0.74, w: 0.26, h: 0.12 };

/** 床が始まる高さ（部屋矩形に対する相対）。ここより上が壁、下が床（docs/16 §2.1.2）。 */
const FLOOR_TOP = 0.42;
/** 窓（docs/16a §6.2 の構図座標・左上）。 */
const WINDOW_RECT: RelRect = { x: 0.08, y: 0.06, w: 0.26, h: 0.3 };
/** 窓から床に落ちる光だまり（同上）。 */
const LIGHT_POOL_RECT: RelRect = { x: 0.12, y: 0.5, w: 0.38, h: 0.34 };

/** 部屋矩形に対する相対矩形を塗る。 */
function fillRelRect(
  ctx: Scene2D,
  room: { readonly x: number; readonly y: number; readonly w: number; readonly h: number },
  rel: RelRect,
): void {
  ctx.fillRect(room.x + room.w * rel.x, room.y + room.h * rel.y, room.w * rel.w, room.h * rel.h);
}

/**
 * 論理サイズ (width×height, CSS px) に対してシーンを描く。
 * DPR スケールは呼び出し側（Scene.tsx）が ctx に適用済みである前提。
 * ⚠️ 配色はテーマ（ライト/ダーク・EP-3.12）を呼び出し側が渡す。既定はライト（テスト・後方互換）。
 */
export function drawScene(
  ctx: Scene2D,
  view: AppView,
  width: number,
  height: number,
  sprites: SpriteImages = {},
  colors: SceneColors = SCENE_LIGHT,
): void {
  ctx.clearRect(0, 0, width, height);

  // 背景
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  // 部屋の枠（構図固定・B3 ③: 毎回同じ画。変わるのは中身だけ）
  const margin = Math.min(width, height) * 0.12;
  const roomX = margin;
  const roomY = margin;
  const roomW = width - margin * 2;
  const roomH = height - margin * 2;

  const room = { x: roomX, y: roomY, w: roomW, h: roomH };

  // 壁（奥）。
  ctx.fillStyle = colors.floor;
  ctx.fillRect(roomX, roomY, roomW, roomH);

  // 窓（左上）。昼は光そのもの、夜は外の青——本作で**唯一の寒色**（docs/16 §2.1.3 / §2.9）。
  ctx.fillStyle = colors.window;
  fillRelRect(ctx, room, WINDOW_RECT);

  // 床（手前）。光の当たる明るい木（docs/16 §2.1.2 の階調）。
  ctx.fillStyle = colors.woodPale;
  fillRelRect(ctx, room, { x: 0, y: FLOOR_TOP, w: 1, h: 1 - FLOOR_TOP });

  // 窓から落ちる光だまり。床の左手に、やわらかく。
  ctx.fillStyle = colors.lightPool;
  fillRelRect(ctx, room, LIGHT_POOL_RECT);

  // 木目。⚠️ 低不透明度で「にじませる」——はっきり描くと途端に安っぽくなる（docs/16 §2.1.2）。
  ctx.strokeStyle = colors.woodGrain;
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const y = roomY + roomH * (FLOOR_TOP + (1 - FLOOR_TOP) * (i / 4));
    ctx.beginPath();
    ctx.moveTo(roomX + roomW * 0.12, y);
    ctx.lineTo(roomX + roomW * 0.88, y);
    ctx.stroke();
  }

  // 手前ほど陰る。⚠️ 影は**黒ではなく暖色**（docs/16 §1.4 の視覚原則）。
  ctx.fillStyle = colors.shade;
  fillRelRect(ctx, room, { x: 0, y: 0.86, w: 1, h: 0.14 });

  // 部屋の枠（構図固定・B3 ③: 毎回同じ画。変わるのは中身だけ）
  ctx.strokeStyle = colors.roomStroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(roomX, roomY, roomW, roomH);

  // 家具。据え置きのクッション（open_floor）＋プレイヤーが置いたもの（EP-4.04）。
  //   ⚠️ 置いていないものは描かない＝部屋は最初「素」で、整えた分だけ絵が変わる（働きかけの手応え）。
  ctx.fillStyle = colors.furniture;
  fillRelRect(ctx, room, CUSHION_RECT);
  for (const kind of view.placements) {
    const rect = PLACEMENT_RECTS[kind];
    if (rect) fillRelRect(ctx, room, rect);
  }

  // 猫: 観察可能な姿勢（catSprite）があるときだけ、**観測された場所**（catPlace）に描く（EP-4.02b）。
  //   ⚠️ 位置は観察文とまったく同じ Phenomenon 由来。文が「高いところにいる」と言えば絵もそこに描かれる。
  //   catSprite=null（隠れ/不在）なら描かない。画像が未読込なら楕円プレースホルダにフォールバック。
  if (view.catSprite) {
    const pos =
      (view.catPlace !== null ? PLACE_POSITIONS[view.catPlace] : undefined) ?? DEFAULT_POSITION;
    const cx = roomX + roomW * pos.x;
    const cy = roomY + roomH * pos.y;
    const image = sprites[view.catSprite];
    if (image) {
      const size = Math.min(roomW, roomH) * 0.34;
      ctx.drawImage(image, cx - size / 2, cy - size / 2, size, size);
    } else {
      ctx.fillStyle = colors.cat;
      ctx.beginPath();
      ctx.ellipse(cx, cy + roomH * 0.05, roomW * 0.1, roomH * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 観察テキスト（見えた事実のみ）。アクセシブルな本文は App の caption 側にも持つ。
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font =
    '600 16px "Hiragino Maru Gothic ProN", "Rounded Mplus 1c", "Hiragino Sans", "Yu Gothic UI", system-ui, sans-serif';
  const line = view.observations[0] ?? '…';
  ctx.fillText(line, width / 2, roomY + roomH + margin * 0.5);
}

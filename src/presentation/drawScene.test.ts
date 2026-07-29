import { describe, it, expect, vi } from 'vitest';
import { drawScene, type Scene2D } from './drawScene';
import type { AppView } from './appView';

/** 記録付きスタブ（jsdom は canvas 2d を持たない）。rects/images は座標検証に使う（EP-4.02b）。 */
type StubCtx = Scene2D & {
  calls: Record<string, number>;
  /** fillRect の引数 [x, y, w, h]。家具の描画数の検証に使う。 */
  rects: number[][];
  /** drawImage の宛先 [dx, dy, dw, dh]。猫の描画位置の検証に使う。 */
  images: number[][];
};

function stubCtx(): StubCtx {
  const calls: Record<string, number> = {};
  const rects: number[][] = [];
  const images: number[][] = [];
  const bump = (name: string) => {
    calls[name] = (calls[name] ?? 0) + 1;
  };
  const rec =
    (name: string) =>
    (..._args: unknown[]) => {
      bump(name);
    };
  return {
    calls,
    rects,
    images,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    clearRect: rec('clearRect'),
    fillRect: (...a: unknown[]) => {
      bump('fillRect');
      rects.push(a as number[]);
    },
    strokeRect: rec('strokeRect'),
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    stroke: rec('stroke'),
    ellipse: rec('ellipse'),
    fill: rec('fill'),
    drawImage: (...a: unknown[]) => {
      bump('drawImage');
      images.push(a.slice(1) as number[]); // [dx, dy, dw, dh]
    },
    fillText: vi.fn(),
  } as unknown as StubCtx;
}

function view(overrides: Partial<AppView> = {}): AppView {
  return {
    restoreStatus: 'empty',
    day: 1,
    segment: 1,
    segmentsPerDay: 6,
    phase: 'running',
    observations: ['丸くなって休んでいる'],
    catSprite: 'cat_curled',
    catPlace: null,
    gamePhase: 'playing',
    decision: null,
    bondTier: 'warming',
    actionSlots: 0,
    placements: [],
    knowledgeNotes: [],
    ...overrides,
  };
}

describe('drawScene（EP-2.10 Canvas 基盤）', () => {
  it('背景・部屋枠・観察テキストを描画する（例外なく）', () => {
    const ctx = stubCtx();
    expect(() => drawScene(ctx, view(), 320, 220)).not.toThrow();
    expect(ctx.calls.clearRect).toBeGreaterThan(0);
    expect(ctx.calls.fillRect).toBeGreaterThan(0);
    expect(ctx.calls.strokeRect).toBeGreaterThan(0);
    expect(ctx.fillText).toHaveBeenCalledWith('丸くなって休んでいる', 160, expect.any(Number));
  });

  it('catSprite があってスプライト画像が未読込なら楕円プレースホルダ', () => {
    const ctx = stubCtx();
    drawScene(ctx, view({ catSprite: 'cat_curled' }), 320, 220);
    expect(ctx.calls.ellipse).toBeGreaterThan(0);
    expect(ctx.calls.drawImage ?? 0).toBe(0);
  });

  it('catSprite に対応する画像があれば drawImage で描く（EP-2.10 サンプル絵）', () => {
    const ctx = stubCtx();
    const fakeSprite = {} as unknown as CanvasImageSource;
    drawScene(ctx, view({ catSprite: 'cat_walking' }), 320, 220, { cat_walking: fakeSprite });
    expect(ctx.calls.drawImage).toBeGreaterThan(0);
    expect(ctx.calls.ellipse ?? 0).toBe(0); // 画像があれば楕円は描かない
  });

  it('catSprite が null（隠れ/不在）なら猫を描かない', () => {
    const ctx = stubCtx();
    const fakeSprite = {} as unknown as CanvasImageSource;
    drawScene(ctx, view({ catSprite: null }), 320, 220, { cat_curled: fakeSprite });
    expect(ctx.calls.ellipse ?? 0).toBe(0);
    expect(ctx.calls.drawImage ?? 0).toBe(0);
  });

  it('観察が空でも … を描いて落ちない', () => {
    const ctx = stubCtx();
    expect(() =>
      drawScene(ctx, view({ observations: [], catSprite: null }), 320, 220),
    ).not.toThrow();
    expect(ctx.fillText).toHaveBeenCalledWith('…', 160, expect.any(Number));
  });
});

describe('drawScene — 観測された場所に猫を描く（EP-4.02b / docs/16 §9 A-3）', () => {
  const img = {} as unknown as CanvasImageSource;

  /** その場所での猫の描画位置 [dx, dy] を取り出す。 */
  function catXY(catPlace: string | null): readonly [number, number] {
    const ctx = stubCtx();
    drawScene(ctx, view({ catSprite: 'cat_sitting', catPlace }), 400, 300, { cat_sitting: img });
    const [dx, dy] = ctx.images[0]!;
    return [dx!, dy!];
  }

  it('場所が違えば猫の描画位置も違う（観察文と絵が同じ場所を指す）', () => {
    const vantage = catXY('phenomenon.at_vantage');
    const refuge = catXY('phenomenon.at_refuge');
    const floor = catXY('phenomenon.at_open_floor');
    expect(vantage).not.toEqual(refuge);
    expect(refuge).not.toEqual(floor);
    expect(floor).not.toEqual(vantage);
  });

  it('Zone の属性と絵の位置が一致する（高所は上・人から遠いすみは奥）', () => {
    const [, vantageY] = catXY('phenomenon.at_vantage');
    const [floorX, floorY] = catXY('phenomenon.at_open_floor');
    const [refugeX] = catXY('phenomenon.at_refuge');
    expect(vantageY).toBeLessThan(floorY); // 高いところ＝上に描く
    expect(refugeX).toBeGreaterThan(floorX); // すみ（人から最も遠い）＝奥＝右に描く
  });

  it('場所が観測できない（隠れ/未知）なら既定位置に描いて落ちない', () => {
    expect(() => catXY(null)).not.toThrow();
  });
});

describe('drawScene — 置いたものが絵に出る（EP-4.04 placements / docs/16 §5.3）', () => {
  it('設置した分だけ家具の矩形が増える（働きかけの手応え）', () => {
    const bare = stubCtx();
    drawScene(bare, view({ placements: [] }), 400, 300);
    const placed = stubCtx();
    drawScene(placed, view({ placements: ['hiding_place', 'high_perch'] }), 400, 300);
    expect(placed.rects.length).toBe(bare.rects.length + 2);
  });

  it('未知の設置種別は静かに無視する（落ちない）', () => {
    const ctx = stubCtx();
    expect(() => drawScene(ctx, view({ placements: ['unknown_thing'] }), 400, 300)).not.toThrow();
  });
});

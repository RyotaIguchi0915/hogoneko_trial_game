import { describe, it, expect, vi } from 'vitest';
import { drawScene, type Scene2D } from './drawScene';
import type { AppView } from './appView';

/** 描画メソッドを記録するスタブ（jsdom は canvas 2d を持たないため）。 */
function stubCtx(): Scene2D & { calls: Record<string, number> } {
  const calls: Record<string, number> = {};
  const rec =
    (name: string) =>
    (..._args: unknown[]) => {
      calls[name] = (calls[name] ?? 0) + 1;
    };
  return {
    calls,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    clearRect: rec('clearRect'),
    fillRect: rec('fillRect'),
    strokeRect: rec('strokeRect'),
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    stroke: rec('stroke'),
    ellipse: rec('ellipse'),
    fill: rec('fill'),
    drawImage: rec('drawImage'),
    fillText: vi.fn(),
  } as unknown as Scene2D & { calls: Record<string, number> };
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
    actionSlots: 0,
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

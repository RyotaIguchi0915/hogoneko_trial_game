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

  it('観察可能なとき猫（プレースホルダ）を描く', () => {
    const ctx = stubCtx();
    drawScene(ctx, view({ observations: ['丸くなって休んでいる'] }), 320, 220);
    expect(ctx.calls.ellipse).toBeGreaterThan(0);
  });

  it('「姿が見当たらない」ときは猫を描かない（隠れている）', () => {
    const ctx = stubCtx();
    drawScene(ctx, view({ observations: ['姿が見当たらない'] }), 320, 220);
    expect(ctx.calls.ellipse ?? 0).toBe(0);
  });

  it('観察が空でも … を描いて落ちない', () => {
    const ctx = stubCtx();
    expect(() => drawScene(ctx, view({ observations: [] }), 320, 220)).not.toThrow();
    expect(ctx.fillText).toHaveBeenCalledWith('…', 160, expect.any(Number));
  });
});

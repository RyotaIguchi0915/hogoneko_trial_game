import { useEffect, useRef } from 'react';
import type { AppView } from './appView';
import { drawScene } from './drawScene';

/**
 * Scene — Canvas 2D の描画ホスト（L4 Presentation / ADR-001）
 *
 * React は canvas 要素の生成とライフサイクルのみ担い、実描画は drawScene（純粋手続き）に委ねる。
 * ⚠️ canvas は装飾（aria-hidden）。観察の本文は App の caption 側にテキストで持つ（a11y / テスト）。
 * ⚠️ view が変わるたびに再描画。DPR に応じて内部解像度をスケールする（滲み防止）。
 */
export function Scene({
  view,
  width = 320,
  height = 220,
}: {
  view: AppView;
  width?: number;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // 非対応環境（jsdom 等）では描画しない

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawScene(ctx, view, width, height);
  }, [view, width, height]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: `${width}px`, height: `${height}px`, display: 'block', margin: '0 auto' }}
    />
  );
}

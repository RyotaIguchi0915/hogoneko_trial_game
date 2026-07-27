import { useEffect, useRef } from 'react';
import type { AppView } from './appView';
import { drawScene, type SpriteImages } from './drawScene';
import { SPRITES, SPRITE_KEYS } from './sprites';

/**
 * Scene — Canvas 2D の描画ホスト（L4 Presentation / ADR-001 / EP-2.10）
 *
 * React は canvas 要素の生成とスプライト読込のみ担い、実描画は drawScene（純粋手続き）に委ねる。
 * ⚠️ canvas は装飾（aria-hidden）。観察の本文は App の caption 側にテキストで持つ（a11y / テスト）。
 * ⚠️ 画像は非同期に読み込む。読込完了ごと・view 変化ごとに再描画する。
 * ⚠️ スプライトはプレースホルダ（sprites.ts）。本番アートは OI-6 で差し替え。
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
  const spritesRef = useRef<SpriteImages>({});

  // 描画（DPR スケール込み）。ctx 非対応環境（jsdom 等）では何もしない。
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(ctx, view, width, height, spritesRef.current);
  };

  // スプライトのプリロード（初回）。読み込めたものから順に反映して再描画。
  useEffect(() => {
    let alive = true;
    for (const key of SPRITE_KEYS) {
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        spritesRef.current = { ...spritesRef.current, [key]: img };
        render();
      };
      img.src = SPRITES[key];
    }
    return () => {
      alive = false;
    };
    // 初回のみ。render は最新の view/dims を参照する（下の effect でも描く）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // view / サイズ変化で再描画。
  useEffect(render, [view, width, height]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ width: `${width}px`, height: `${height}px`, display: 'block', margin: '0 auto' }}
    />
  );
}

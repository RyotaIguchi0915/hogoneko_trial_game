import { describe, it, expect } from 'vitest';
import { createRng, restoreRng } from './Rng';

/**
 * RNG Service のテスト — 決定論性の検証（B4 G-3 / B5 SR-3 / DevConst ⑩）。
 * これが本作の全シミュレーションの再現性の土台になる。
 */
describe('RNG Service', () => {
  describe('決定論性', () => {
    it('同一シードは同一系列を返す', () => {
      const a = createRng(12345);
      const b = createRng(12345);
      const seqA = Array.from({ length: 100 }, () => a.next());
      const seqB = Array.from({ length: 100 }, () => b.next());
      expect(seqA).toEqual(seqB);
    });

    it('異なるシードは異なる系列を返す', () => {
      const a = createRng(1);
      const b = createRng(2);
      const first10A = Array.from({ length: 10 }, () => a.next());
      const first10B = Array.from({ length: 10 }, () => b.next());
      expect(first10A).not.toEqual(first10B);
    });
  });

  describe('値域', () => {
    it('next() は [0, 1) に収まる', () => {
      const rng = createRng(999);
      for (let i = 0; i < 10_000; i++) {
        const v = rng.next();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });

    it('int() は [min, max) に収まり、両端を含みうる', () => {
      const rng = createRng(42);
      const seen = new Set<number>();
      for (let i = 0; i < 10_000; i++) {
        const v = rng.int(3, 8);
        expect(v).toBeGreaterThanOrEqual(3);
        expect(v).toBeLessThan(8);
        expect(Number.isInteger(v)).toBe(true);
        seen.add(v);
      }
      // 十分な試行で下限3と上限側7が観測される
      expect(seen.has(3)).toBe(true);
      expect(seen.has(7)).toBe(true);
    });

    it('int() は不正な範囲で例外を投げる（握りつぶさない・AD-32）', () => {
      const rng = createRng(1);
      expect(() => rng.int(5, 5)).toThrow(RangeError);
      expect(() => rng.int(5, 2)).toThrow(RangeError);
    });
  });

  describe('ストリーム分離（B5 §8.4）', () => {
    it('同一 (stream, salts) は同一系列を返す', () => {
      const root = createRng(777);
      const s1 = root.fork('behavior', 5, 3);
      const s2 = root.fork('behavior', 5, 3);
      const seq1 = Array.from({ length: 20 }, () => s1.next());
      const seq2 = Array.from({ length: 20 }, () => s2.next());
      expect(seq1).toEqual(seq2);
    });

    it('fork は消費状態に依存しない（元シード由来）', () => {
      const root = createRng(777);
      const before = root.fork('weather', 1).next();
      // root を大量に消費してから同じ fork を取る
      for (let i = 0; i < 50; i++) root.next();
      const after = root.fork('weather', 1).next();
      expect(after).toBe(before);
    });

    it('異なるストリームは異なる系列を生む', () => {
      const root = createRng(777);
      const weather = root.fork('weather', 1).next();
      const behavior = root.fork('behavior', 1).next();
      const trace = root.fork('trace', 1).next();
      expect(new Set([weather, behavior, trace]).size).toBe(3);
    });

    it('異なる salts は異なる系列を生む', () => {
      const root = createRng(777);
      const day1 = root.fork('behavior', 1).next();
      const day2 = root.fork('behavior', 2).next();
      expect(day1).not.toBe(day2);
    });
  });

  describe('セーブ復元（B4 §9.3）', () => {
    it('state を保存・復元すると続きが一致する', () => {
      const original = createRng(2024);
      // 途中まで消費
      for (let i = 0; i < 30; i++) original.next();
      const savedState = original.state;

      // 続きを記録
      const continued = Array.from({ length: 20 }, () => original.next());

      // 復元して続きが一致するか
      const restored = restoreRng(2024, savedState);
      const replayed = Array.from({ length: 20 }, () => restored.next());

      expect(replayed).toEqual(continued);
    });

    it('復元した RNG も同じシードで fork できる', () => {
      const original = createRng(2024);
      for (let i = 0; i < 10; i++) original.next();
      const restored = restoreRng(2024, original.state);

      const a = original.fork('profile').next();
      const b = restored.fork('profile').next();
      expect(a).toBe(b);
    });
  });
});

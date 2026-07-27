import { describe, it, expect } from 'vitest';
import { appendObservations, type ObservationEntry } from './observation';

const entry = (day: number, segment: number, descriptor: string): ObservationEntry => ({
  day,
  segment,
  subject: 'cat',
  descriptor,
});

describe('観察履歴 appendObservations（追記のみ・B4 §9.2/§9.5）', () => {
  it('追記した分だけ末尾に増える（既存を書き換えない）', () => {
    const a = entry(1, 1, 'phenomenon.curled_resting');
    const b = entry(1, 3, 'phenomenon.roaming');
    const log1 = appendObservations([], [a]);
    const log2 = appendObservations(log1, [b]);
    expect(log1).toEqual([a]);
    expect(log2).toEqual([a, b]);
    // 追記は元配列を破壊しない（不変）。
    expect(log1).toEqual([a]);
  });

  it('複数件をまとめて追記できる', () => {
    const log = appendObservations([entry(1, 1, 'x')], [entry(1, 3, 'y'), entry(1, 4, 'z')]);
    expect(log.map((e) => e.descriptor)).toEqual(['x', 'y', 'z']);
  });

  it('空追記は同一参照を返す（無駄なコピーをしない）', () => {
    const log = [entry(1, 1, 'x')];
    expect(appendObservations(log, [])).toBe(log);
  });
});

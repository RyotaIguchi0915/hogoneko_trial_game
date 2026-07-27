import { describe, it, expect } from 'vitest';
import { derivePlayerKnowledge } from './PlayerKnowledge';
import type { ObservationEntry } from '@core/index';

const e = (descriptor: string, day = 1, segment = 1): ObservationEntry => ({
  day,
  segment,
  subject: 'cat',
  descriptor,
});

describe('Player Knowledge 再生成（L3 / B7 / G-2）', () => {
  it('空の履歴からは「何も観測していない」理解になる', () => {
    const k = derivePlayerKnowledge([]);
    expect(k.totalObservations).toBe(0);
    expect(k.observed).toEqual([]);
    expect(k.directSightings).toBe(0);
  });

  it('descriptor ごとに回数を数え、最後に見た時を持つ', () => {
    const k = derivePlayerKnowledge([
      e('phenomenon.curled_resting', 1, 1),
      e('phenomenon.roaming', 1, 3),
      e('phenomenon.curled_resting', 2, 1),
    ]);
    expect(k.totalObservations).toBe(3);
    const resting = k.observed.find((o) => o.descriptor === 'phenomenon.curled_resting');
    expect(resting?.count).toBe(2);
    expect(resting?.lastSeen).toEqual({ day: 2, segment: 1 }); // 直近で上書き
  });

  it('頻度降順→同数は初出順で安定ソート（決定論・G-3）', () => {
    const k = derivePlayerKnowledge([
      e('a'),
      e('b'),
      e('b'),
      e('c'), // a:1(初出0) b:2(初出1) c:1(初出3)
    ]);
    // b(2) が先頭。a と c は同数(1) → 初出順で a が先。
    expect(k.observed.map((o) => o.descriptor)).toEqual(['b', 'a', 'c']);
  });

  it('out_of_sight は directSightings に数えない（猫を直接見た回数）', () => {
    const k = derivePlayerKnowledge([
      e('phenomenon.out_of_sight'),
      e('phenomenon.curled_resting'),
      e('phenomenon.out_of_sight'),
    ]);
    expect(k.totalObservations).toBe(3);
    expect(k.directSightings).toBe(1); // 直接見えたのは1回だけ
  });

  it('履歴が同じなら常に同じ理解を返す（純粋・再生成可能）', () => {
    const log = [e('a'), e('b'), e('a')];
    expect(derivePlayerKnowledge(log)).toEqual(derivePlayerKnowledge(log));
  });
});

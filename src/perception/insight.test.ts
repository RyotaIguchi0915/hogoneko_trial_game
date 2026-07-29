import { describe, it, expect } from 'vitest';
import type { ObservationEntry } from '@core/index';
import { deriveInsights, isDetailed, resolvedDescriptor } from './insight';
import { HYPOTHESIS_TEMPLATES } from './hypotheses';

/**
 * 1 Segment 分の観測をつくる（同じ day/segment に複数の descriptor が並ぶ）。
 * ⚠️ subject は deriveInsights の判定に使われないため 'cat' で統一する（descriptor だけが材料）。
 */
function seg(day: number, segment: number, descriptors: readonly string[]): ObservationEntry[] {
  return descriptors.map((descriptor) => ({ day, segment, subject: 'cat' as const, descriptor }));
}

const insightOf = (log: readonly ObservationEntry[], id: string) =>
  deriveInsights(log).find((x) => x.hypothesisId === id)!;

describe('Insight — 対比観測（docs/06:126「反復＋対比＝仮説」）', () => {
  it('片側しか見ていなければ対比観測は成立しない', () => {
    const log = [...seg(1, 1, ['phenomenon.at_vantage']), ...seg(1, 3, ['phenomenon.at_vantage'])];
    const i = insightOf(log, 'hypothesis.likes_height');
    expect(i.supporting).toBe(2);
    expect(i.contrasting).toBe(0);
    expect(i.contrastObserved).toBe(false); // まだ推し量る材料が揃っていない
  });

  it('起きた／起きなかったの両方を見ると対比観測が成立する', () => {
    const log = [...seg(1, 1, ['phenomenon.at_vantage']), ...seg(1, 3, ['phenomenon.at_refuge'])];
    const i = insightOf(log, 'hypothesis.likes_height');
    expect(i.supporting).toBe(1);
    expect(i.contrasting).toBe(1);
    expect(i.contrastObserved).toBe(true);
  });

  it('同じ Segment は1件として数える（二重に数えない）', () => {
    const log = seg(1, 1, ['phenomenon.at_vantage', 'phenomenon.ears_orienting']);
    expect(insightOf(log, 'hypothesis.likes_height').supporting).toBe(1);
  });
});

describe('Insight — 引き金つきの仮説は、その Segment だけを材料にする', () => {
  it('物音がしていない Segment の振る舞いは数えない', () => {
    const log = [
      ...seg(1, 1, ['phenomenon.curled_resting']), // 音なし → 材料にならない
      ...seg(1, 3, ['phenomenon.sudden_noise', 'phenomenon.out_of_sight']), // 音あり → 支持
    ];
    const i = insightOf(log, 'hypothesis.noise_sensitive');
    expect(i.supporting).toBe(1);
    expect(i.contrasting).toBe(0);
  });

  it('物音がしたのに動じていなければ反証として数える', () => {
    const log = seg(1, 3, ['phenomenon.sudden_noise', 'phenomenon.curled_resting']);
    expect(insightOf(log, 'hypothesis.noise_sensitive').contrasting).toBe(1);
  });
});

describe('Insight — 反証が優勢なら解像度が静かに戻る（docs/06:1291 責めない）', () => {
  const formed = ['hypothesis.likes_height'];

  it('支持が優勢なら詳しいまま', () => {
    const log = [
      ...seg(1, 1, ['phenomenon.at_vantage']),
      ...seg(1, 3, ['phenomenon.at_vantage']),
      ...seg(2, 1, ['phenomenon.at_refuge']),
    ];
    expect(isDetailed('phenomenon.at_vantage', formed, deriveInsights(log))).toBe(true);
  });

  it('反証が優勢になると元の語に戻る（⚠️ 通知も警告も出さない）', () => {
    const log = [
      ...seg(1, 1, ['phenomenon.at_vantage']),
      ...seg(1, 3, ['phenomenon.at_refuge']),
      ...seg(2, 1, ['phenomenon.at_open_floor']),
    ];
    const insights = deriveInsights(log);
    expect(isDetailed('phenomenon.at_vantage', formed, insights)).toBe(false);
    expect(resolvedDescriptor('phenomenon.at_vantage', formed, insights)).toBe(
      'phenomenon.at_vantage',
    );
  });

  it('insights を渡さなければ反証判定をしない（EP-4.03 時点の挙動）', () => {
    expect(isDetailed('phenomenon.at_vantage', formed)).toBe(true);
  });
});

describe('Insight — 観測境界（憲章 I-1 / G-2）', () => {
  it('仮説を持たなければ、どれだけ観察しても詳しくならない', () => {
    const log = seg(1, 1, ['phenomenon.at_vantage']);
    expect(isDetailed('phenomenon.at_vantage', [], deriveInsights(log))).toBe(false);
  });

  it('観察が無ければ全テンプレがゼロから始まる（決定論・並びも安定）', () => {
    const insights = deriveInsights([]);
    expect(insights.map((i) => i.hypothesisId)).toEqual(HYPOTHESIS_TEMPLATES.map((t) => t.id));
    for (const i of insights) {
      expect(i.supporting).toBe(0);
      expect(i.contrasting).toBe(0);
      expect(i.contrastObserved).toBe(false);
      expect(i.refuted).toBe(false);
    }
  });

  it('⚠️ Insight は真実を参照しない — 同じ観察履歴からは常に同じ結果（純粋関数）', () => {
    const log = [...seg(1, 1, ['phenomenon.at_vantage']), ...seg(1, 3, ['phenomenon.at_refuge'])];
    expect(deriveInsights(log)).toEqual(deriveInsights(log));
  });
});

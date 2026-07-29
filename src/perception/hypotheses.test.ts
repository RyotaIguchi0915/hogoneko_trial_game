import { describe, it, expect } from 'vitest';
import type { PlayerKnowledge } from './PlayerKnowledge';
import { HYPOTHESIS_TEMPLATES, availableHypotheses, isKnownHypothesis } from './hypotheses';

/** 指定の現象だけを見た状態の Player Knowledge（真実は登場しない・G-2）。 */
function knowledgeOf(descriptors: readonly string[]): PlayerKnowledge {
  return {
    totalObservations: descriptors.length,
    observed: descriptors.map((descriptor) => ({
      descriptor,
      count: 1,
      lastSeen: { day: 1, segment: 1 },
    })),
    directSightings: descriptors.length,
  };
}

describe('仮説 — 観測したものからしか立てられない（docs/06:660）', () => {
  it('何も見ていないうちは、立てられる仮説が無い', () => {
    expect(availableHypotheses(knowledgeOf([]))).toEqual([]);
  });

  it('物音を聞いて初めて「物音が苦手そう」を持てる', () => {
    expect(availableHypotheses(knowledgeOf(['phenomenon.sudden_noise']))).toContain(
      'hypothesis.noise_sensitive',
    );
    // 高いところを見ただけでは、音について推し量る言葉は持てない。
    expect(availableHypotheses(knowledgeOf(['phenomenon.at_vantage']))).not.toContain(
      'hypothesis.noise_sensitive',
    );
  });

  it('場所ごとの仮説は、その場所で見かけたときだけ立てられる', () => {
    const pairs: Array<[string, string]> = [
      ['phenomenon.at_vantage', 'hypothesis.likes_height'],
      ['phenomenon.at_refuge', 'hypothesis.likes_cover'],
      ['phenomenon.at_open_floor', 'hypothesis.comes_close'],
    ];
    for (const [descriptor, hypothesis] of pairs) {
      expect(availableHypotheses(knowledgeOf([descriptor]))).toEqual([hypothesis]);
    }
  });

  it('並びはテンプレ定義順で安定（決定論・G-3）', () => {
    const all = HYPOTHESIS_TEMPLATES.flatMap((t) => t.requires);
    expect(availableHypotheses(knowledgeOf(all))).toEqual(HYPOTHESIS_TEMPLATES.map((t) => t.id));
  });

  it('未知のIDは既知として扱わない（不正セーブの防御）', () => {
    expect(isKnownHypothesis('hypothesis.nope')).toBe(false);
    expect(isKnownHypothesis('hypothesis.likes_height')).toBe(true);
  });
});

describe('仮説 — 支持と反証の定義（EP-4.05 の材料）', () => {
  it('全テンプレが支持・反証の両方を定義している（対比観測が成立しうる）', () => {
    for (const t of HYPOTHESIS_TEMPLATES) {
      expect(t.supportedBy.length).toBeGreaterThan(0);
      expect(t.contrastedBy.length).toBeGreaterThan(0);
      // 同じ現象が支持でも反証でもある、という矛盾を持たない。
      for (const d of t.supportedBy) expect(t.contrastedBy).not.toContain(d);
    }
  });
});

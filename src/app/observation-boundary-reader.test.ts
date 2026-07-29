import { describe, it, expect } from 'vitest';
import { GameRuntime } from './GameRuntime';
import { createMemorySaveStorage, isInRoomSegment } from '@core/index';

/**
 * 観測境界の回帰防止（憲章 I-1）— L4 面の `reader` は Cat State の数値を出さない。
 *
 * EP-4.x で reader の面が増えた（bondTier / placements / hypotheses …）。個体差 CatProfile・
 * 環境設置・仮説など新機能を足しても、**L4 が受け取るのは質的カテゴリ・文字列・進行だけ**で、
 * 内部状態（trust/vigilance/affect/needs や profile の数値）は決して越えない、を機械的に守る。
 * 真実（Cat State / Profile）は開発専用の createTruthReader だけが数値で持つ（本番除去・EP-12）。
 */
const clock = () => 1000;

function playedRuntime(): GameRuntime {
  const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 2 });
  rt.begin();
  rt.placeItem('hiding_place'); // 環境設置（EP-4.04）
  for (let i = 0; i < 12; i += 1) {
    if (isInRoomSegment(rt.reader.getProgress().segment)) rt.feed(); // 世話（EP-2.08）
    rt.advanceSegment();
  }
  return rt;
}

describe('観測境界: L4 面 reader は Cat State を数値で出さない（EP-4.x 回帰防止・I-1）', () => {
  it('reader は真実（Cat State / Profile）へのアクセサを持たない', () => {
    const rt = playedRuntime();
    const reader = rt.reader as unknown as Record<string, unknown>;
    for (const forbidden of [
      'getCatState',
      'getCatProfile',
      'getTrust',
      'getVigilance',
      'getAffect',
    ]) {
      expect(forbidden in reader).toBe(false);
    }
    rt.dispose();
  });

  it('絆/理解ティアは質的カテゴリ（数値ではない・EP-4.06）', () => {
    const rt = playedRuntime();
    const tier = rt.reader.getBondTier();
    expect(['distant', 'warming', 'bonded']).toContain(tier);
    expect(typeof tier).not.toBe('number');
    rt.dispose();
  });

  it('観測（Phenomenon）に数値フィールドが無い（EP-2.04/4.02）', () => {
    const rt = playedRuntime();
    for (const p of rt.reader.getObservation()) {
      for (const v of Object.values(p)) expect(typeof v).not.toBe('number');
    }
    rt.dispose();
  });

  it('設置・仮説は文字列のみ（Player 側の情報・Cat State ではない・EP-4.03/4.04）', () => {
    const rt = playedRuntime();
    for (const s of rt.reader.getPlacements()) expect(typeof s).toBe('string');
    for (const h of rt.reader.getHypotheses()) expect(typeof h).toBe('string');
    rt.dispose();
  });

  it('真実は createTruthReader だけが数値で持つ（分離の確認・EP-12/4.01）', () => {
    const rt = playedRuntime();
    expect(typeof rt.createTruthReader().getCatState().relationship.trust).toBe('number');
    expect(typeof rt.createTruthReader().getCatProfile().neuroticism).toBe('number');
    rt.dispose();
  });
});

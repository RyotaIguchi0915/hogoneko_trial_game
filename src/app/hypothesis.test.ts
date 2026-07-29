import { describe, it, expect } from 'vitest';
import { GameRuntime } from './GameRuntime';
import { createMemorySaveStorage } from '@core/index';

/**
 * 仮説を立てる（EP-4.03 / docs/18 B-C）の結線テスト。
 * ⚠️ 「合っていたか」を確かめるテストは**書けない**。正誤という情報がシステムに存在しないため
 *    （docs/06:616 採点しない / G-2 真実を参照しない）。ここで確かめるのは可否・保存・トグルだけ。
 */

const clock = () => 1000;

/** 観測が溜まるまで進める（在室 Segment で場所と行動が記録される）。 */
function playSegments(rt: GameRuntime, n: number): void {
  for (let i = 0; i < n; i++) rt.advanceSegment();
}

function newRuntime(seed = 42) {
  const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed });
  rt.begin();
  return rt;
}

describe('GameRuntime — 仮説を立てる（EP-4.03）', () => {
  it('何も見ていないうちは、立てられる仮説が無い', () => {
    const rt = newRuntime();
    expect(rt.reader.getAvailableHypotheses()).toEqual([]);
    rt.dispose();
  });

  it('観測していない現象についての仮説は立てられない（not-observed）', () => {
    const rt = newRuntime();
    expect(rt.toggleHypothesis('hypothesis.likes_height')).toEqual({
      ok: false,
      reason: 'not-observed',
    });
    expect(rt.reader.getHypotheses()).toEqual([]);
    rt.dispose();
  });

  it('未知のIDは受け付けない（unknown）', () => {
    const rt = newRuntime();
    expect(rt.toggleHypothesis('hypothesis.nope')).toEqual({ ok: false, reason: 'unknown' });
    rt.dispose();
  });

  it('観測済みなら立てられ、もう一度呼ぶと下ろせる（トグル・考えが変わるのは自然）', () => {
    const rt = newRuntime();
    playSegments(rt, 6 * 3);
    const available = rt.reader.getAvailableHypotheses();
    expect(available.length).toBeGreaterThan(0);
    const id = available[0]!;
    expect(rt.toggleHypothesis(id)).toEqual({ ok: true, formed: true });
    expect(rt.reader.getHypotheses()).toContain(id);
    expect(rt.toggleHypothesis(id)).toEqual({ ok: true, formed: false });
    expect(rt.reader.getHypotheses()).not.toContain(id);
    rt.dispose();
  });

  it('立てた仮説はセーブ往復で保たれる（観察履歴から導出できない＝保存が要る）', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 42 });
    rt1.begin();
    playSegments(rt1, 6 * 3);
    const id = rt1.reader.getAvailableHypotheses()[0]!;
    rt1.toggleHypothesis(id);
    expect(rt1.save().ok).toBe(true);
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 42 });
    expect(rt2.reader.getHypotheses()).toContain(id);
    rt2.dispose();
  });

  it('⚠️ 結果に正誤を表す情報が無い（構造検証・docs/06:616）', () => {
    const rt = newRuntime();
    playSegments(rt, 6 * 3);
    const id = rt.reader.getAvailableHypotheses()[0]!;
    const result = rt.toggleHypothesis(id);
    // ok と formed だけ。correct / score / confidence の類は存在しない。
    expect(Object.keys(result).sort()).toEqual(['formed', 'ok']);
    rt.dispose();
  });

  it('立てられる仮説は観測が進むほど増える（見たぶんだけ推し量れる）', () => {
    const rt = newRuntime();
    playSegments(rt, 6);
    const early = rt.reader.getAvailableHypotheses().length;
    playSegments(rt, 6 * 20);
    expect(rt.reader.getAvailableHypotheses().length).toBeGreaterThanOrEqual(early);
    rt.dispose();
  });
});

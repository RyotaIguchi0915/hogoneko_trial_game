import { describe, it, expect } from 'vitest';
import { createRng } from '@core/index';
import { generateCatProfile, BASE_PROFILES, PROFILE_JITTER } from './catProfile';

/** ある seed の profile ストリームから個体を生成する（GameRuntime と同じ流儀）。 */
function profileForSeed(seed: number) {
  return generateCatProfile(createRng(seed).fork('profile'));
}

describe('generateCatProfile（個体差・EP-4.01）', () => {
  it('決定論: 同一 seed は常に同一個体', () => {
    expect(profileForSeed(42)).toEqual(profileForSeed(42));
  });

  it('全軸が 0..1 に収まる', () => {
    for (const seed of [1, 2, 3, 42, 100, 999, 12345]) {
      const p = profileForSeed(seed);
      for (const v of [p.neuroticism, p.coverSeeking, p.heightSeeking, p.sociability]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('seed を変えると（多くの場合）別の個体になる', () => {
    const seeds = [1, 2, 3, 7, 42, 100, 999, 12345];
    const keys = new Set(seeds.map((s) => JSON.stringify(profileForSeed(s))));
    // 8 seed から少なくとも複数タイプが出る（全員同一ではない＝個体差が効いている）。
    expect(keys.size).toBeGreaterThan(3);
  });

  it('ベース個体からの変動は JITTER の範囲内（完全ランダムでない・docs/04:1910）', () => {
    // 生成個体は、いずれかのベース個体から各軸 ±JITTER 以内に収まる。
    const p = profileForSeed(42);
    const nearBase = BASE_PROFILES.some(
      (b) =>
        Math.abs(b.neuroticism - p.neuroticism) <= PROFILE_JITTER + 1e-9 &&
        Math.abs(b.coverSeeking - p.coverSeeking) <= PROFILE_JITTER + 1e-9 &&
        Math.abs(b.heightSeeking - p.heightSeeking) <= PROFILE_JITTER + 1e-9 &&
        Math.abs(b.sociability - p.sociability) <= PROFILE_JITTER + 1e-9,
    );
    expect(nearBase).toBe(true);
  });
});

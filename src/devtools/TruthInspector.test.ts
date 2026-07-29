import { describe, it, expect } from 'vitest';
import { createTruthInspector } from './TruthInspector';
import type { TruthReader } from '@core/index';
import { initialCatState } from '@core/state/catState';
import { NEUTRAL_PROFILE } from '@core/state/catProfile';

const cat = { ...initialCatState(), arrived: true };
const fakeReader: TruthReader = {
  getGamePhase: () => 'playing',
  getProgress: () => ({ day: 2, segment: 1, phase: 'running' }),
  getCatState: () => cat,
  getCatProfile: () => NEUTRAL_PROFILE,
  getRngState: () => 999,
};

describe('TruthInspector（EP-12・開発ビルド限定・読取専用）', () => {
  it('真実（Cat State を含む）のスナップショットを読み取れる', () => {
    const inspector = createTruthInspector(fakeReader);
    expect(inspector.snapshot()).toEqual({
      gamePhase: 'playing',
      progress: { day: 2, segment: 1, phase: 'running' },
      cat,
      rngState: 999,
    });
  });

  it('format は本番混入検出用の目印を含む', () => {
    const inspector = createTruthInspector(fakeReader);
    expect(inspector.format()).toContain('hogoneko-devtools');
  });

  it('状態を変更する API を公開しない（読取専用）', () => {
    const inspector = createTruthInspector(fakeReader);
    expect(Object.keys(inspector).sort()).toEqual(['format', 'snapshot']);
  });
});

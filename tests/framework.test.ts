import { describe, it, expect } from 'vitest';
import { createRng, type GameSnapshot } from '@core/index';
import { expectDeterministic, expectSeededDeterministic } from './utils/determinism';
import { expectSnapshotRoundTrip } from './utils/saveRoundTrip';

/**
 * テスト基盤の枠組みの自己検証（EP-11）。
 * 再現性・セーブ往復の共通ユーティリティが機能することを保証する。
 */

describe('再現性テストの枠組み', () => {
  it('同一シードの RNG 列が完全一致する', () => {
    const seq = expectDeterministic(() => {
      const rng = createRng(42);
      return [rng.next(), rng.int(0, 100), rng.next()];
    });
    expect(seq).toHaveLength(3);
  });

  it('expectSeededDeterministic がシードから再現する', () => {
    expectSeededDeterministic((seed) => {
      const rng = createRng(seed);
      return [rng.next(), rng.next()];
    });
  });
});

describe('セーブ往復テストの枠組み', () => {
  it('サンプル snapshot が往復で一致する', () => {
    const snapshot: GameSnapshot = {
      determinism: { seed: 7, streamState: 11 },
      progress: { day: 4, segment: 2, phase: 'running' },
      gamePhase: 'playing',
      simulation: { cat: { arrived: true } },
    };
    expectSnapshotRoundTrip(snapshot);
  });
});

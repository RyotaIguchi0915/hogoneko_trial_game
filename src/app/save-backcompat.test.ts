import { describe, it, expect } from 'vitest';
import { GameRuntime } from './GameRuntime';
import { createMemorySaveStorage, serialize, type GameSnapshot } from '@core/index';
import { initialCatState } from '@core/state/catState';

/**
 * Save 後方互換の規律（B4 §9.6）— EP-4.x の任意フィールドが無い旧セーブも読める。
 *
 * EP-3.08/4.06 decision・EP-4.03 hypotheses・EP-4.04 placements … と Persisted の任意フィールドが増えた。
 * 複数の実装が同じ Snapshot にフィールドを足していくので、「追加は任意（absent は既定で補完）・version bump
 * 不要」の規律が守られているかを統合レベルで担保する。将来 required で足す/`?? 既定`忘れを機械的に検出する。
 */
const clock = () => 1000;
const KEY = 'hogoneko/save/v1';

describe('Save 後方互換: EP-4.x 任意フィールドが無い最小セーブも復元できる', () => {
  it('placements/hypotheses/decision 等を持たないセーブは既定（空/null）で復元し、進めても壊れない', () => {
    const storage = createMemorySaveStorage();
    // 必須フィールドだけの最小スナップショット（EP-4.x の任意フィールドを一切持たない）。
    const minimal: GameSnapshot = {
      determinism: { seed: 7, streamState: 7 },
      progress: { day: 3, segment: 2, phase: 'running' },
      gamePhase: 'playing',
      simulation: { cat: initialCatState() },
    };
    storage.write(KEY, JSON.stringify(serialize(minimal, 1000, 'x')));

    const rt = GameRuntime.create({ storage, clock, seed: 7 });
    expect(rt.reader.getRestoreStatus()).toBe('ok'); // 復元成功（検証を通る）
    expect(rt.reader.getPlacements()).toEqual([]); // EP-4.04 追加フィールドは空既定
    expect(rt.reader.getHypotheses()).toEqual([]); // EP-4.03 〃
    expect(rt.reader.getDecision()).toBeNull(); // EP-3.08/4.06 〃
    expect(() => {
      rt.advanceSegment();
      rt.save();
    }).not.toThrow(); // 復元後に進めて再保存しても壊れない
    rt.dispose();
  });
});

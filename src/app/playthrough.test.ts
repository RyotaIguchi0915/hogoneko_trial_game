import { describe, it, expect } from 'vitest';
import { GameRuntime } from './GameRuntime';
import { createMemorySaveStorage } from '@core/index';

/**
 * Sprint2 通しプレイ統合テスト（合成ルート全層貫通）。
 *
 * 個々の機構（Sim/観察履歴/痕跡/介入/セーブ）は各 test で検証済み。ここでは**30日を通した統合**で
 * 憲章の2大約束を守ることを保証する:
 *   - G-3 決定論: 同一シードの通しプレイは最終状態まで完全再現する。
 *   - Pillar 4 再構築: 途中でセーブ→再開しても、連続実行と同じ最終状態に至る（巻き戻しではなく再構築）。
 */
const clock = () => 1000;

/** phase='ended' まで進める（安全上限つき）。進めた Segment 数を返す。 */
function playToEnd(rt: GameRuntime, cap = 400): number {
  let n = 0;
  while (rt.reader.getProgress().phase === 'running' && n < cap) {
    rt.advanceSegment();
    n += 1;
  }
  return n;
}

describe('Sprint2 通しプレイ統合（30日）', () => {
  it('30日を無停止で最後まで進め、phase=ended・Day30 で終わる', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 20260727 });
    const advanced = playToEnd(rt);

    const end = rt.reader.getProgress();
    expect(end.phase).toBe('ended');
    expect(end.day).toBe(30);
    expect(advanced).toBe(30 * 6); // 180 Segment（30日 × 6）
    expect(rt.reader.getObservationLog().length).toBeGreaterThan(0); // 観察が積まれている
    rt.dispose();
  });

  it('同一シードの通しプレイは最終状態（真実・観察履歴・RNG）まで完全再現する（G-3）', () => {
    const run = () => {
      const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 777 });
      playToEnd(rt);
      const snapshot = {
        cat: rt.createTruthReader().getCatState(),
        log: rt.reader.getObservationLog(),
        rng: rt.createTruthReader().getRngState(),
      };
      rt.dispose();
      return snapshot;
    };
    expect(run()).toEqual(run());
  });

  it('途中でセーブ→再開しても連続実行と同じ最終状態に至る（再構築≡連続・Pillar 4）', () => {
    const SEED = 4242;

    // 基準: 連続実行の最終状態。
    const contiguous = GameRuntime.create({
      storage: createMemorySaveStorage(),
      clock,
      seed: SEED,
    });
    playToEnd(contiguous);
    const expectedCat = contiguous.createTruthReader().getCatState();
    const expectedLog = contiguous.reader.getObservationLog();
    contiguous.dispose();

    // 中断実行: 途中まで進めて保存 → 破棄 → 同じ storage から再構築して最後まで。
    const storage = createMemorySaveStorage();
    const first = GameRuntime.create({ storage, clock, seed: SEED });
    for (let i = 0; i < 50; i += 1) first.advanceSegment(); // Day9 付近で中断
    first.save();
    first.dispose();

    const resumed = GameRuntime.create({ storage, clock, seed: SEED });
    expect(resumed.reader.getRestoreStatus()).toBe('ok');
    playToEnd(resumed);

    // 再開後の最終状態は連続実行と一致する（fork-by-coordinate の決定論・保存位置に非依存）。
    expect(resumed.reader.getProgress().phase).toBe('ended');
    expect(resumed.createTruthReader().getCatState()).toEqual(expectedCat);
    expect(resumed.reader.getObservationLog()).toEqual(expectedLog);
    resumed.dispose();
  });
});

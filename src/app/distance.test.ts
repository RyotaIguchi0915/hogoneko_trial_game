import { describe, it, expect } from 'vitest';
import { GameRuntime, type HumanDistance } from './GameRuntime';
import { createMemorySaveStorage } from '@core/index';

/**
 * あなたの居場所（EP-4.04c / docs/18 B-D）の結線テスト。
 * ⚠️ ここで確かめるのは「**環境に効いている**」ことまで。
 *    「近づけば懐く」ようなテストは書かない——そういう保証は設計上存在しない（憲章 I-2）。
 */

const clock = () => 1000;

describe('GameRuntime — あなたの居場所（EP-4.04c）', () => {
  it('既定は ふつう（normal）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    expect(rt.reader.getHumanDistance()).toBe('normal');
    rt.dispose();
  });

  it('本編中は変えられ、セーブ往復で保たれる', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 42 });
    rt1.begin();
    rt1.setHumanDistance('far');
    expect(rt1.reader.getHumanDistance()).toBe('far');
    expect(rt1.save().ok).toBe(true);
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 42 });
    expect(rt2.reader.getHumanDistance()).toBe('far');
    rt2.dispose();
  });

  it('本編前（booting）は変わらない', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    rt.setHumanDistance('near');
    expect(rt.reader.getHumanDistance()).toBe('normal');
    rt.dispose();
  });

  it('行動枠を消費しない（居場所は介入ではなく状態・B2 §4）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    rt.begin();
    rt.advanceSegment(); // Seg1 = 在室（枠あり）
    const before = rt.reader.getActionSlots();
    rt.setHumanDistance('far');
    expect(rt.reader.getActionSlots()).toBe(before);
    rt.dispose();
  });

  it('⚠️ 距離は環境に効く（ただし「近づけば懐く」ではない・I-2）', () => {
    // seed=2 は神経質・遮蔽好き（EP-4.01 診断）。⚠️ この子は隠れ家が無いと trust が 0 に張り付く
    // ので、EP-4.04 と同条件（隠れ家あり）で土台を作ってから距離の差だけを見る。
    // 確かめるのは「居場所が環境に反映されている」ことだけで、「近づけば懐く」ではない。
    const runTrust = (distance: HumanDistance) => {
      const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 2 });
      rt.begin();
      rt.placeItem('hiding_place');
      rt.setHumanDistance(distance);
      for (let i = 0; i < 6 * 15; i++) rt.advanceSegment();
      const t = rt.createTruthReader().getCatState().relationship.trust;
      rt.dispose();
      return t;
    };
    expect(runTrust('far')).toBeGreaterThan(runTrust('near'));
  });
});

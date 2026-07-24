import { describe, it, expect } from 'vitest';
import { GameRuntime } from './GameRuntime';
import { createMemorySaveStorage } from '../save/SaveStorage';

const clock = () => 1000;

describe('GameRuntime — 新規起動', () => {
  it('セーブが無ければ Day1/Segment0・booting から始まる', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    expect(rt.reader.getRestoreStatus()).toBe('empty');
    expect(rt.reader.getProgress()).toEqual({ day: 1, segment: 0, phase: 'running' });
    expect(rt.reader.getGamePhase()).toBe('booting');
    rt.dispose();
  });
});

describe('GameRuntime — 保存 → 再起動で復元（EP-14 リロード復元）', () => {
  it('進行を保存し、別 Runtime が同じ進行を復元する', () => {
    const storage = createMemorySaveStorage();

    const rt1 = GameRuntime.create({ storage, clock, seed: 42 });
    rt1.advanceSegment(); // seg1
    rt1.advanceSegment(); // seg2
    rt1.advanceSegment(); // seg3
    const saveResult = rt1.save();
    expect(saveResult.ok).toBe(true);
    const progressBefore = rt1.reader.getProgress();
    rt1.dispose();

    // 「リロード」= 同じストレージから新しい Runtime を組み立てる
    const rt2 = GameRuntime.create({ storage, clock, seed: 42 });
    expect(rt2.reader.getRestoreStatus()).toBe('ok');
    expect(rt2.reader.getProgress()).toEqual(progressBefore);
    rt2.dispose();
  });

  it('日をまたいだ進行も復元される', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 1 });
    // segmentsPerDay=6 → 6回進めると Day2 Segment0
    for (let i = 0; i < 6; i++) rt1.advanceSegment();
    expect(rt1.reader.getProgress().day).toBe(2);
    rt1.save();
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 1 });
    expect(rt2.reader.getProgress()).toEqual({ day: 2, segment: 0, phase: 'running' });
    rt2.dispose();
  });

  it('保存しなければ復元されない（自動保存は明示 save() 経由）', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 1 });
    rt1.advanceSegment();
    rt1.dispose(); // save() を呼ばない

    const rt2 = GameRuntime.create({ storage, clock, seed: 1 });
    expect(rt2.reader.getRestoreStatus()).toBe('empty');
    rt2.dispose();
  });
});

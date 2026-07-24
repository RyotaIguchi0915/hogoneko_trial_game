import { describe, it, expect } from 'vitest';
import { GameRuntime } from './GameRuntime';
import { createMemorySaveStorage } from '@core/index';
import { initialCatState } from '@core/state/catState';

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
    rt1.advanceSegment();
    rt1.advanceSegment();
    rt1.advanceSegment();
    expect(rt1.save().ok).toBe(true);
    const progressBefore = rt1.reader.getProgress();
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 42 });
    expect(rt2.reader.getRestoreStatus()).toBe('ok');
    expect(rt2.reader.getProgress()).toEqual(progressBefore);
    rt2.dispose();
  });

  it('日をまたいだ進行も復元される', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 1 });
    for (let i = 0; i < 6; i++) rt1.advanceSegment();
    expect(rt1.reader.getProgress().day).toBe(2);
    rt1.save();
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 1 });
    expect(rt2.reader.getProgress()).toEqual({ day: 2, segment: 0, phase: 'running' });
    rt2.dispose();
  });

  it('保存しなければ復元されない', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 1 });
    rt1.advanceSegment();
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 1 });
    expect(rt2.reader.getRestoreStatus()).toBe('empty');
    rt2.dispose();
  });
});

describe('GameRuntime — createTruthReader（EP-12 dev 支援・読取専用）', () => {
  it('起動直後は初期 Cat State を読み取れる', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    const reader = rt.createTruthReader();
    expect(reader.getGamePhase()).toBe('booting');
    expect(reader.getCatState()).toEqual(initialCatState());
    expect(typeof reader.getRngState()).toBe('number');
    rt.dispose();
  });
});

describe('GameRuntime — Segment ループが Simulation を駆動する（EP-2.05）', () => {
  it('advanceSegment で猫の内部状態が推移する', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    const before = rt.createTruthReader().getCatState();
    rt.advanceSegment();
    const after = rt.createTruthReader().getCatState();
    expect(after).not.toEqual(before);
    expect(after.needs.hunger).toBeGreaterThan(before.needs.hunger); // step4 時間経過
    rt.dispose();
  });

  it('在室 Segment でのみ Familiarity が増える（B2 §3.2: SG-2/4/5=index 1/3/4）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 7 });
    // Seg0(未明・不在) → Seg1(朝・在室): 在室なので familiarity 増
    rt.advanceSegment();
    const atSeg1 = rt.createTruthReader().getCatState().relationship.familiarity;
    expect(atSeg1).toBeGreaterThan(0);
    // Seg1 → Seg2(昼・不在): familiarity 据え置き
    rt.advanceSegment();
    const atSeg2 = rt.createTruthReader().getCatState().relationship.familiarity;
    expect(atSeg2).toBe(atSeg1);
    rt.dispose();
  });

  it('同一シードで猫状態の推移が再現する（決定論）', () => {
    const run = () => {
      const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 99 });
      for (let i = 0; i < 6; i++) rt.advanceSegment();
      const cat = rt.createTruthReader().getCatState();
      rt.dispose();
      return cat;
    };
    expect(run()).toEqual(run());
  });

  it('推移した猫状態がセーブ往復で保たれる', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 5 });
    for (let i = 0; i < 4; i++) rt1.advanceSegment();
    const catBefore = rt1.createTruthReader().getCatState();
    rt1.save();
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 5 });
    expect(rt2.createTruthReader().getCatState()).toEqual(catBefore);
    rt2.dispose();
  });
});

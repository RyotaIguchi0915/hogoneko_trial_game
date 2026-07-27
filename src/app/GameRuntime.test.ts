import { describe, it, expect } from 'vitest';
import { GameRuntime } from './GameRuntime';
import {
  createMemorySaveStorage,
  serialize,
  type GameSnapshot,
  type SaveStorage,
} from '@core/index';
import { initialCatState } from '@core/state/catState';

const clock = () => 1000;

/** 指定の進行・痕跡を持つセーブを storage に仕込む（痕跡ライフサイクルを決定論的に検証するため）。 */
function seedSave(storage: SaveStorage, over: Partial<GameSnapshot> = {}): void {
  const snap: GameSnapshot = {
    determinism: { seed: 1, streamState: 1 },
    progress: { day: 1, segment: 2, phase: 'running' }, // Seg2=昼=不在（次の advance で Seg3=在室）
    gamePhase: 'playing',
    simulation: { cat: initialCatState() },
    ...over,
  };
  storage.write('hogoneko/save/v1', JSON.stringify(serialize(snap, 1, 'x')));
}

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

describe('GameRuntime — 介入（餌やり）と行動枠（EP-2.08 / B2 §4）', () => {
  it('起動直後（Seg0=未明=不在）は行動枠0・給餌できない', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    expect(rt.reader.getActionSlots()).toBe(0);
    expect(rt.feed()).toEqual({ ok: false, reason: 'away' });
    rt.dispose();
  });

  it('在室 Segment では枠2・給餌で枠が減り、空腹が下がる', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    rt.advanceSegment(); // Seg1=朝=在室
    expect(rt.reader.getActionSlots()).toBe(2);
    const before = rt.createTruthReader().getCatState().needs.hunger;

    const result = rt.feed();
    expect(result).toEqual({ ok: true, slotsLeft: 1 });
    expect(rt.reader.getActionSlots()).toBe(1);
    expect(rt.createTruthReader().getCatState().needs.hunger).toBeLessThan(before);
    rt.dispose();
  });

  it('枠を使い切ると給餌できない（観察無制限・介入有限の非対称）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    rt.advanceSegment();
    rt.feed();
    rt.feed();
    expect(rt.reader.getActionSlots()).toBe(0);
    expect(rt.feed()).toEqual({ ok: false, reason: 'no-slots' });
    rt.dispose();
  });

  it('Segment を進めると行動枠がリセットされる（未使用は繰り越さない）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    rt.advanceSegment(); // Seg1 在室 枠2
    rt.feed(); // 枠1
    rt.advanceSegment(); // Seg2=昼=不在 → 枠0
    expect(rt.reader.getActionSlots()).toBe(0);
    rt.advanceSegment(); // Seg3=夕=在室 → 枠2（リセット）
    expect(rt.reader.getActionSlots()).toBe(2);
    rt.dispose();
  });
});

describe('GameRuntime — 観察履歴の蓄積・復元（EP-2.07 / B4 §9.2 / G-2）', () => {
  it('起動直後は履歴が空（まだ Segment を観測していない）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    expect(rt.reader.getObservationLog()).toEqual([]);
    rt.dispose();
  });

  it('advanceSegment ごとに観測が1件だけ追記される（day/segment を伴う）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    rt.advanceSegment(); // Seg1 を観測
    rt.advanceSegment(); // Seg2 を観測
    const log = rt.reader.getObservationLog();
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({ day: 1, segment: 1 });
    expect(log[1]).toMatchObject({ day: 1, segment: 2 });
    rt.dispose();
  });

  it('観察履歴がセーブ往復で保たれ、リロードで重複追記しない', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 42 });
    rt1.advanceSegment();
    rt1.advanceSegment();
    const before = rt1.reader.getObservationLog();
    expect(before).toHaveLength(2);
    rt1.save();
    rt1.dispose();

    // 再起動しただけでは履歴は増えない（構築時に自動観測しない）。
    const rt2 = GameRuntime.create({ storage, clock, seed: 42 });
    expect(rt2.reader.getObservationLog()).toEqual(before);
    // さらに進めると続きから積まれる（追記のみ）。
    rt2.advanceSegment();
    expect(rt2.reader.getObservationLog()).toHaveLength(3);
    rt2.dispose();
  });
});

describe('GameRuntime — 痕跡の発見（EP-2.06 / B2 §3.2）', () => {
  const traceSubjects = (rt: GameRuntime) =>
    rt.reader.getObservation().filter((p) => p.subject === 'trace');

  it('不在中は痕跡が見えない（自分がいないので発見できない）', () => {
    const storage = createMemorySaveStorage();
    seedSave(storage, { traces: [{ kind: 'shed_fur' }] }); // Seg2=不在・痕跡あり
    const rt = GameRuntime.create({ storage, clock, seed: 1 });
    expect(rt.reader.getProgress().segment).toBe(2);
    expect(traceSubjects(rt)).toEqual([]); // 不在なので痕跡は出さない（out_of_sight のみ）
    expect(rt.reader.getObservation()[0]?.descriptor).toBe('phenomenon.out_of_sight');
    rt.dispose();
  });

  it('在室で戻ると痕跡を発見し、観察スナップショットと履歴の双方に現れる', () => {
    const storage = createMemorySaveStorage();
    seedSave(storage, { traces: [{ kind: 'shed_fur' }, { kind: 'food_reduced' }] });
    const rt = GameRuntime.create({ storage, clock, seed: 1 });
    rt.advanceSegment(); // Seg2 → Seg3（在室）で発見

    const traces = traceSubjects(rt);
    expect(traces.map((p) => p.descriptor)).toEqual([
      'phenomenon.shed_fur',
      'phenomenon.food_reduced',
    ]);
    // 履歴にも痕跡が記録される（Player Knowledge の元）。
    const logged = rt.reader.getObservationLog().filter((e) => e.subject === 'trace');
    expect(logged.map((e) => e.descriptor)).toEqual([
      'phenomenon.shed_fur',
      'phenomenon.food_reduced',
    ]);
    rt.dispose();
  });

  it('発見した痕跡は次の在室 Segment で重複記録されない（発見済みでクリア）', () => {
    const storage = createMemorySaveStorage();
    seedSave(storage, { traces: [{ kind: 'shed_fur' }] });
    const rt = GameRuntime.create({ storage, clock, seed: 1 });
    rt.advanceSegment(); // Seg3（在室）で発見・記録
    rt.advanceSegment(); // Seg4（在室）: pending は空 → 痕跡なし
    expect(traceSubjects(rt)).toEqual([]);
    const tracesInLog = rt.reader.getObservationLog().filter((e) => e.subject === 'trace');
    expect(tracesInLog).toHaveLength(1); // 1回だけ記録
    rt.dispose();
  });

  it('発見後に保存すると未発見痕跡は空になる（往復で消費が保たれる）', () => {
    const storage = createMemorySaveStorage();
    seedSave(storage, { traces: [{ kind: 'shed_fur' }] });
    const rt1 = GameRuntime.create({ storage, clock, seed: 1 });
    rt1.advanceSegment(); // Seg3 在室で発見 → pending クリア
    rt1.save();
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 1 });
    // 復元直後（Seg3 在室）: 既に発見済みなので痕跡は残っていない。
    expect(rt2.reader.getObservation().filter((p) => p.subject === 'trace')).toEqual([]);
    rt2.dispose();
  });

  it('痕跡生成を含む進行が同一シードで再現する（決定論・Success 条件）', () => {
    const run = () => {
      const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 314 });
      for (let i = 0; i < 12; i++) rt.advanceSegment(); // 2日分
      const log = rt.reader.getObservationLog();
      rt.dispose();
      return log;
    };
    expect(run()).toEqual(run());
  });
});

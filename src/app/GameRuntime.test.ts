import { describe, it, expect } from 'vitest';
import { GameRuntime } from './GameRuntime';
import {
  createMemorySaveStorage,
  serialize,
  isInRoomSegment,
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

  it('clearSave 後は新規（empty）から始まる＝もう一度あずかる土台（EP-3.13）', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 1 });
    rt1.advanceSegment();
    rt1.advanceSegment();
    expect(rt1.save().ok).toBe(true);
    rt1.clearSave();
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 1 });
    expect(rt2.reader.getRestoreStatus()).toBe('empty');
    expect(rt2.reader.getProgress()).toEqual({ day: 1, segment: 0, phase: 'running' });
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

describe('GameRuntime — 文脈つき観察: 環境音（EP-4.02）', () => {
  it('突発音が在室の観察に「物音がした」として現れる（引き金→反応の因果ペア）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    rt.begin();
    for (let i = 0; i < 6 * 30; i++) rt.advanceSegment(); // 十分回せば音は起きる（chance 0.14）
    const log = rt.reader.getObservationLog();
    expect(log.some((e) => e.descriptor === 'phenomenon.sudden_noise')).toBe(true);
    rt.dispose();
  });

  it('音は在室 Segment でのみ観測される（不在では聞かない・観測境界）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    rt.begin();
    for (let i = 0; i < 6 * 30; i++) rt.advanceSegment();
    const noiseEntries = rt.reader
      .getObservationLog()
      .filter((e) => e.descriptor === 'phenomenon.sudden_noise');
    for (const e of noiseEntries) expect(isInRoomSegment(e.segment)).toBe(true);
    rt.dispose();
  });
});

describe('GameRuntime — 個体差 CatProfile（EP-4.01）', () => {
  const profileOf = (seed: number) => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed });
    const p = rt.createTruthReader().getCatProfile();
    rt.dispose();
    return p;
  };

  it('seed を変えると別の個体になる（毎回同じ猫ではない）', () => {
    const seeds = [1, 2, 3, 7, 42, 100, 999, 12345];
    const keys = new Set(seeds.map((s) => JSON.stringify(profileOf(s))));
    expect(keys.size).toBeGreaterThan(3);
  });

  it('同一 seed は常に同一個体（決定論・profile は f(seed)）', () => {
    expect(profileOf(42)).toEqual(profileOf(42));
  });

  it('セーブ往復（復元）でも同一個体（保存せず seed から再生成）', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 777 });
    rt1.begin();
    for (let i = 0; i < 6; i++) rt1.advanceSegment();
    const before = rt1.createTruthReader().getCatProfile();
    rt1.save();
    rt1.dispose();
    const rt2 = GameRuntime.create({ storage, clock, seed: 777 });
    expect(rt2.createTruthReader().getCatProfile()).toEqual(before);
    rt2.dispose();
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

describe('GameRuntime — 介入（ご飯をあげる）と行動枠（EP-2.08 / B2 §4）', () => {
  it('起動直後（Seg0=未明=不在）は行動枠0・ご飯をあげられない', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    expect(rt.reader.getActionSlots()).toBe(0);
    expect(rt.feed()).toEqual({ ok: false, reason: 'away' });
    rt.dispose();
  });

  it('在室 Segment では枠2・ご飯をあげると枠が減り、空腹が下がる', () => {
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

  it('枠を使い切るとご飯をあげられない（観察無制限・介入有限の非対称）', () => {
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

describe('GameRuntime — イベント発火（EP-2.09 発火 runtime）', () => {
  const readSave = (storage: SaveStorage) =>
    JSON.parse(storage.read('hogoneko/save/v1') as string).data as Record<string, any>;

  it('その Day に達するとイベントが発火し、対象 Zone の属性デルタと発火IDが保存される', () => {
    const storage = createMemorySaveStorage();
    const rt = GameRuntime.create({ storage, clock, seed: 1 });
    rt.advanceSegment(); // Day1: seeding（zone.refuge の cover +0.3）が発火
    rt.save();
    const data = readSave(storage);
    expect(data.firedEventIds).toContain('event.safe_place.seeding');
    // 対象 Zone（refuge）にだけ属性デルタが乗る（遮蔽が増える）。
    expect(data.zoneOverrides['zone.refuge'].cover).toBeGreaterThan(0);
    rt.dispose();
  });

  it('同じイベントは同一 Day 内で再発火しない（オーバレイが積み増しされない）', () => {
    const storage = createMemorySaveStorage();
    const rt = GameRuntime.create({ storage, clock, seed: 1 });
    rt.advanceSegment(); // Day1 Seg1: seeding 発火
    rt.save();
    const afterFire = readSave(storage).zoneOverrides['zone.refuge'].cover;
    for (let i = 0; i < 4; i++) rt.advanceSegment(); // Day1 Seg2..5（まだ Day1）
    rt.save();
    expect(readSave(storage).zoneOverrides['zone.refuge'].cover).toBe(afterFire); // 一度きり
    rt.dispose();
  });

  it('発火状態がセーブ往復で保たれ、復元後に再発火しない', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 1 });
    for (let i = 0; i < 8; i++) rt1.advanceSegment(); // Day1..2: seeding + contrast 発火
    rt1.save();
    const before = readSave(storage);
    expect(before.firedEventIds).toEqual(
      expect.arrayContaining(['event.safe_place.seeding', 'event.safe_place.contrast']),
    );
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 1 });
    rt2.save(); // 復元直後に保存 → 発火状態は変わらない（再発火しない）
    const after = readSave(storage);
    expect([...after.firedEventIds].sort()).toEqual([...before.firedEventIds].sort());
    expect(after.zoneOverrides).toEqual(before.zoneOverrides);
    rt2.dispose();
  });
});

describe('GameRuntime — トライアル物語アーク（EP-3.01）', () => {
  /** phase='ended' まで進める（安全上限つき）。 */
  const playToEnd = (rt: GameRuntime, cap = 400) => {
    let n = 0;
    while (rt.reader.getProgress().phase === 'running' && n < cap) {
      rt.advanceSegment();
      n += 1;
    }
  };

  it('begin() で booting→playing（title/preparing を経る内部遷移）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 1 });
    expect(rt.reader.getGamePhase()).toBe('booting');
    rt.begin();
    expect(rt.reader.getGamePhase()).toBe('playing');
    rt.begin(); // 冪等
    expect(rt.reader.getGamePhase()).toBe('playing');
    rt.dispose();
  });

  it('showTitle()→start() でタイトル→本編（EP-3.10）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 1 });
    rt.showTitle();
    expect(rt.reader.getGamePhase()).toBe('title'); // 新規はタイトルで止まる
    rt.showTitle(); // 冪等（title からは動かない）
    expect(rt.reader.getGamePhase()).toBe('title');
    rt.start();
    expect(rt.reader.getGamePhase()).toBe('playing'); // はじめる→本編
    rt.start(); // 冪等
    expect(rt.reader.getGamePhase()).toBe('playing');
    rt.dispose();
  });

  it('title のまま30日消化しても deciding に遷移しない（start しないと本編が進まない）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 1 });
    rt.showTitle(); // title 止まり（start しない）
    playToEnd(rt);
    expect(rt.reader.getProgress().phase).toBe('ended');
    expect(rt.reader.getGamePhase()).toBe('title'); // playing でないので deciding へ遷移しない
    rt.dispose();
  });

  it('30日を消化すると playing→deciding へ自動遷移する', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 1 });
    rt.begin();
    playToEnd(rt);
    expect(rt.reader.getProgress().phase).toBe('ended');
    expect(rt.reader.getGamePhase()).toBe('deciding');
    rt.dispose();
  });

  it('decide()→advancePhase() で deciding→ending→epilogue→reflection と進み、reflection で止まる（EP-3.08）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 1 });
    rt.begin();
    playToEnd(rt); // deciding
    // deciding→ending は decide()（選択が要る）。advancePhase では動かない。
    expect(rt.advancePhase()).toBe('deciding'); // 選択前は進まない
    rt.decide('adopt');
    expect(rt.reader.getGamePhase()).toBe('ending');
    expect(rt.reader.getDecision()).toBe('adopt');
    expect(rt.advancePhase()).toBe('epilogue');
    expect(rt.advancePhase()).toBe('reflection');
    expect(rt.advancePhase()).toBe('reflection'); // 終端（それ以上進まない）
    rt.dispose();
  });

  it('decide は deciding 以外では効かない／決定と絆ティアがセーブ往復で保たれる（EP-3.08）', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 1 });
    rt1.decide('adopt'); // まだ playing 前 → 無効
    expect(rt1.reader.getDecision()).toBeNull();
    rt1.begin();
    playToEnd(rt1);
    rt1.decide('return');
    expect(rt1.reader.getDecision()).toBe('return');
    rt1.save();
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 1 });
    expect(rt2.reader.getDecision()).toBe('return'); // 復元
    expect(['distant', 'warming', 'bonded']).toContain(rt2.reader.getBondTier());
    rt2.dispose();
  });

  it('begin() を呼ばなければ 30日消化でも deciding に遷移しない（アークは opt-in）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 1 });
    playToEnd(rt); // begin() 未呼び出し → gamePhase は booting のまま
    expect(rt.reader.getProgress().phase).toBe('ended');
    expect(rt.reader.getGamePhase()).toBe('booting'); // 不正遷移せず据え置き
    rt.dispose();
  });

  it('アーク途中（deciding）のフェーズがセーブ往復で復元される', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 1 });
    rt1.begin();
    playToEnd(rt1); // deciding
    rt1.save();
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 1 });
    expect(rt2.reader.getGamePhase()).toBe('deciding'); // 復元後も deciding（begin は冪等で戻さない）
    rt2.dispose();
  });
});

describe('GameRuntime — cat-location（ゾーン移動・EP-3.02）', () => {
  const REAL_ZONES = ['zone.refuge', 'zone.open_floor', 'zone.vantage'];

  it('起動直後の現在地は既定 Zone（refuge）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    expect(rt.createTruthReader().getCatState().currentZone).toBe('zone.refuge');
    rt.dispose();
  });

  it('進行中の現在地は実在ゾーンの範囲で選ばれ、決定論的に再現する', () => {
    const visited = (seed: number) => {
      const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed });
      const seen: string[] = [];
      for (let i = 0; i < 12; i++) {
        rt.advanceSegment();
        seen.push(rt.createTruthReader().getCatState().currentZone);
      }
      rt.dispose();
      return seen;
    };
    const a = visited(7);
    for (const z of a) expect(REAL_ZONES).toContain(z); // 未定義ゾーンへは行かない
    expect(visited(7)).toEqual(a); // 同一シードで再現（決定論）
  });

  it('現在地 Zone がセーブ往復で保たれる', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 7 });
    for (let i = 0; i < 5; i++) rt1.advanceSegment();
    const zoneBefore = rt1.createTruthReader().getCatState().currentZone;
    rt1.save();
    rt1.dispose();

    const rt2 = GameRuntime.create({ storage, clock, seed: 7 });
    expect(rt2.createTruthReader().getCatState().currentZone).toBe(zoneBefore);
    rt2.dispose();
  });
});

describe('GameRuntime — 関係の発達（日次 Trust・EP-3.05）', () => {
  it('穏やかな数日で Trust が育つ（従来は不変 0.05 だった）', () => {
    // seed=1 は穏やか・社交的な個体（EP-4.01）。神経質で内向的な子は逆に育ちにくい＝個体差。
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 1 });
    rt.begin();
    const t0 = rt.createTruthReader().getCatState().relationship.trust;
    for (let i = 0; i < 6 * 8; i++) rt.advanceSegment(); // 8日分
    expect(rt.createTruthReader().getCatState().relationship.trust).toBeGreaterThan(t0);
    rt.dispose();
  });

  it('日次 Trust は日境界でのみ動く（Day1 の Segment 内では不変）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 12345 });
    rt.begin();
    const t0 = rt.createTruthReader().getCatState().relationship.trust;
    for (let i = 0; i < 5; i++) rt.advanceSegment(); // Day1 内（Seg1..5・日をまたがない）
    expect(rt.createTruthReader().getCatState().relationship.trust).toBe(t0);
    rt.dispose();
  });

  it('育った Trust がセーブ往復で保たれる', () => {
    const storage = createMemorySaveStorage();
    const rt1 = GameRuntime.create({ storage, clock, seed: 12345 });
    rt1.begin();
    for (let i = 0; i < 6 * 10; i++) rt1.advanceSegment();
    const trust = rt1.createTruthReader().getCatState().relationship.trust;
    rt1.save();
    rt1.dispose();
    const rt2 = GameRuntime.create({ storage, clock, seed: 12345 });
    expect(rt2.createTruthReader().getCatState().relationship.trust).toBe(trust);
    rt2.dispose();
  });
});

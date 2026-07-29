import { describe, it, expect } from 'vitest';
import { createMemorySaveStorage, serialize, type GameSnapshot } from '@core/index';
import { ContentRegistryBuilder } from '@data/index';
import { phenomenonSchema, qualifierSchema, type PhenomenonDef } from '@data/schemas/phenomenon';
import { PHENOMENON_CONTENT, QUALIFIER_CONTENT } from '@content/phenomena';
import { GATEWAY_DESCRIPTORS } from '@perception/index';
import { GameRuntime } from './GameRuntime';

const clock = () => 1000;

describe('現象語彙 content（B11 D-2）', () => {
  it('サンプル語彙が strict 検証を通る', () => {
    expect(() =>
      new ContentRegistryBuilder()
        .add(phenomenonSchema, PHENOMENON_CONTENT)
        .add(qualifierSchema, QUALIFIER_CONTENT)
        .build({ strict: true }),
    ).not.toThrow();
  });

  it('Gateway が産出する descriptor はすべて語彙に定義済み（未定義生成なし・B4 P-02）', () => {
    const { registry } = new ContentRegistryBuilder()
      .add(phenomenonSchema, PHENOMENON_CONTENT)
      .build({ strict: true });
    const defined = new Set(registry.getAll<PhenomenonDef>('phenomenon').map((p) => p.id));
    for (const d of GATEWAY_DESCRIPTORS) {
      expect(defined.has(d)).toBe(true);
    }
  });
});

describe('GameRuntime.observe（EP-2.04 観測境界の越境点）', () => {
  it('観測すると Phenomenon（数値なし）を返す', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    const out = rt.observe();
    expect(out.length).toBeGreaterThan(0);
    for (const p of out) {
      for (const v of Object.values(p)) {
        expect(typeof v).not.toBe('number');
      }
    }
    rt.dispose();
  });

  it('観測しなければ何も返さない（P-03）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    expect(rt.observe(false)).toEqual([]);
    rt.dispose();
  });

  it('不在 Segment では out_of_sight（Seg0=未明は不在）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    // 起動直後は Day1 Seg0（未明・不在）。
    // ⚠️ 先頭は時間帯の文脈（EP-4.02d）になったので、猫の様子は subject で探す。
    const out = rt.observe();
    expect(out.find((p) => p.subject === 'cat')?.descriptor).toBe('phenomenon.out_of_sight');
    expect(out[0]?.descriptor).toBe('phenomenon.time_dawn');
    rt.dispose();
  });

  it('観察は〈時間帯〉を先頭に並ぶ（文脈から読める・EP-4.02d / docs/18 B-B）', () => {
    const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock, seed: 42 });
    rt.begin();
    rt.advanceSegment(); // Seg1 = SG-2 朝・在室
    const out = rt.reader.getObservation();
    expect(out[0]?.subject).toBe('time');
    expect(out[0]?.descriptor).toBe('phenomenon.time_morning');
    // 時間帯のあとに、その場面の中身（場所・行動）が続く。
    expect(out.map((p) => p.subject)).toContain('cat');
    rt.dispose();
  });

  it('互換性のない旧セーブは拒否して新規開始する（クラッシュしない・EP-2.02 回帰防止）', () => {
    const storage = createMemorySaveStorage();
    // EP-2.01 以前の最小 cat 形を仕込む（needs/affect 等なし）
    const bad = serialize(
      {
        determinism: { seed: 1, streamState: 1 },
        progress: { day: 1, segment: 0, phase: 'running' },
        gamePhase: 'booting',
        simulation: { cat: { arrived: false } },
      } as unknown as GameSnapshot,
      1,
      'x',
    );
    storage.write('hogoneko/save/v1', JSON.stringify(bad));

    const rt = GameRuntime.create({ storage, clock, seed: 1 });
    expect(rt.reader.getRestoreStatus()).toBe('unrecoverable');
    expect(() => {
      rt.advanceSegment();
      rt.observe();
    }).not.toThrow();
    rt.dispose();
  });
});

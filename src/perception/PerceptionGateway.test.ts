import { describe, it, expect } from 'vitest';
import { initialCatState, type CatState } from '@core/state/catState';
import {
  toPhenomena,
  tracesToPhenomena,
  soundToPhenomena,
  GATEWAY_DESCRIPTORS,
} from './PerceptionGateway';
import type { Trace } from '@core/state/trace';

function catWith(behavior: CatState['behavior']): CatState {
  return { ...initialCatState(), behavior };
}

describe('PerceptionGateway — 真実→現象の変換（B4 P-01）', () => {
  it('在室・観測中は「どこで」→「何をしているか」の順で返す（EP-4.02b）', () => {
    // initialCatState の居場所は zone.refuge。場所が先・行動が後＝文脈から行動へ読める順。
    const out = toPhenomena(catWith('resting'), { inRoom: true, observing: true });
    expect(out).toEqual([
      { subject: 'place', descriptor: 'phenomenon.at_refuge', observability: true },
      { subject: 'cat', descriptor: 'phenomenon.curled_resting', observability: true },
    ]);
  });

  it('行動ごとに対応する descriptor へ変換する', () => {
    const map: Array<[CatState['behavior'], string]> = [
      ['hiding', 'phenomenon.out_of_sight'],
      ['alert', 'phenomenon.ears_orienting'],
      ['exploring', 'phenomenon.roaming'],
      ['eating', 'phenomenon.at_food'],
      ['grooming', 'phenomenon.self_grooming'],
    ];
    for (const [behavior, descriptor] of map) {
      const out = toPhenomena(catWith(behavior), { inRoom: true, observing: true });
      expect(out.find((p) => p.subject === 'cat')?.descriptor).toBe(descriptor);
    }
  });

  it('不在 Segment では猫は直接見えない（out_of_sight）', () => {
    const out = toPhenomena(catWith('resting'), { inRoom: false, observing: true });
    expect(out[0]?.descriptor).toBe('phenomenon.out_of_sight');
  });

  it('観測していなければ何も返さない（P-03）', () => {
    expect(toPhenomena(catWith('resting'), { inRoom: true, observing: false })).toEqual([]);
  });
});

describe('PerceptionGateway — 観測境界（憲章 I-1 / B4 P-01）', () => {
  it('出力に数値・真実参照が含まれない（構造検証）', () => {
    const out = toPhenomena(catWith('alert'), { inRoom: true, observing: true });
    for (const p of out) {
      for (const value of Object.values(p)) {
        expect(typeof value).not.toBe('number');
      }
      // 真実の数値フィールド名が漏れていない
      expect(Object.keys(p)).not.toContain('vigilance');
      expect(Object.keys(p)).not.toContain('affect');
    }
  });

  it('産出する descriptor はすべて既知語彙（未定義の動的生成をしない・B4 P-02）', () => {
    const behaviors: Array<CatState['behavior']> = [
      'resting',
      'hiding',
      'alert',
      'exploring',
      'eating',
      'grooming',
    ];
    for (const b of behaviors) {
      // 場所を含む全 Phenomenon が既知語彙であること（EP-4.02b で場所が加わった）。
      for (const p of toPhenomena(catWith(b), { inRoom: true, observing: true })) {
        expect(GATEWAY_DESCRIPTORS).toContain(p.descriptor);
      }
    }
  });
});

describe('PerceptionGateway — 場所→現象（文脈つき観察・EP-4.02b / docs/18 B-B）', () => {
  function catAt(zone: string, behavior: CatState['behavior'] = 'resting'): CatState {
    return { ...initialCatState(), currentZone: zone, behavior };
  }

  it('居場所ごとに対応する場所 descriptor を返す（既知語彙・数値なし）', () => {
    const map: Array<[string, string]> = [
      ['zone.refuge', 'phenomenon.at_refuge'],
      ['zone.vantage', 'phenomenon.at_vantage'],
      ['zone.open_floor', 'phenomenon.at_open_floor'],
    ];
    for (const [zone, descriptor] of map) {
      const place = toPhenomena(catAt(zone), { inRoom: true, observing: true }).find(
        (p) => p.subject === 'place',
      );
      expect(place?.descriptor).toBe(descriptor);
      expect(GATEWAY_DESCRIPTORS).toContain(descriptor);
      for (const v of Object.values(place!)) expect(typeof v).not.toBe('number');
    }
  });

  it('場所は行動より前に来る（文脈→行動の順で因果が読める）', () => {
    const out = toPhenomena(catAt('zone.vantage', 'alert'), { inRoom: true, observing: true });
    expect(out.map((p) => p.subject)).toEqual(['place', 'cat']);
  });

  it('隠れている間は場所を語らない（姿が見えないなら居場所も見えない・P-03）', () => {
    const out = toPhenomena(catAt('zone.refuge', 'hiding'), { inRoom: true, observing: true });
    expect(out).toEqual([
      { subject: 'cat', descriptor: 'phenomenon.out_of_sight', observability: true },
    ]);
  });

  it('不在 Segment でも場所を語らない（見ていないので分からない）', () => {
    const out = toPhenomena(catAt('zone.vantage'), { inRoom: false, observing: true });
    expect(out.some((p) => p.subject === 'place')).toBe(false);
  });

  it('未知の Zone では場所を語らない（未定義語彙を動的生成しない・B4 P-02）', () => {
    const out = toPhenomena(catAt('zone.unknown'), { inRoom: true, observing: true });
    expect(out.some((p) => p.subject === 'place')).toBe(false);
    expect(out.map((p) => p.descriptor)).toEqual(['phenomenon.curled_resting']);
  });
});

describe('PerceptionGateway — 痕跡→現象（EP-2.06）', () => {
  it('痕跡種別を subject:trace の Phenomenon（数値なし）へ変換する', () => {
    const traces: readonly Trace[] = [{ kind: 'shed_fur' }, { kind: 'food_reduced' }];
    const out = tracesToPhenomena(traces);
    expect(out).toEqual([
      { subject: 'trace', descriptor: 'phenomenon.shed_fur', observability: true },
      { subject: 'trace', descriptor: 'phenomenon.food_reduced', observability: true },
    ]);
  });

  it('痕跡が産出する descriptor もすべて既知語彙（B4 P-02）', () => {
    const kinds: Array<Trace['kind']> = ['shed_fur', 'moved_object', 'food_reduced', 'warm_hollow'];
    for (const p of tracesToPhenomena(kinds.map((kind) => ({ kind })))) {
      expect(GATEWAY_DESCRIPTORS).toContain(p.descriptor);
      for (const value of Object.values(p)) expect(typeof value).not.toBe('number');
    }
  });

  it('痕跡なしなら空（発見するものが無い）', () => {
    expect(tracesToPhenomena([])).toEqual([]);
  });
});

describe('PerceptionGateway — 環境音→現象（文脈つき観察・EP-4.02）', () => {
  it('聞こえたら subject:sound の「物音がした」を返す（既知語彙・数値なし）', () => {
    const out = soundToPhenomena(true);
    expect(out).toEqual([
      { subject: 'sound', descriptor: 'phenomenon.sudden_noise', observability: true },
    ]);
    expect(GATEWAY_DESCRIPTORS).toContain(out[0]!.descriptor);
    for (const v of Object.values(out[0]!)) expect(typeof v).not.toBe('number');
  });

  it('聞こえなければ空（在室でも音が起きていない Segment）', () => {
    expect(soundToPhenomena(false)).toEqual([]);
  });
});

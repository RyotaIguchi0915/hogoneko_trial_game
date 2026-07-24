import { describe, it, expect } from 'vitest';
import { initialCatState, type CatState } from '@core/state/catState';
import { toPhenomena, GATEWAY_DESCRIPTORS } from './PerceptionGateway';
import type { Phenomenon } from './Phenomenon';

function catWith(behavior: CatState['behavior']): CatState {
  return { ...initialCatState(), behavior };
}

describe('PerceptionGateway — 真実→現象の変換（B4 P-01）', () => {
  it('在室・観測中は現在行動を観測可能な事実として返す', () => {
    const out = toPhenomena(catWith('resting'), { inRoom: true, observing: true });
    expect(out).toEqual([
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
      expect(toPhenomena(catWith(behavior), { inRoom: true, observing: true })[0]?.descriptor).toBe(
        descriptor,
      );
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
      const p = toPhenomena(catWith(b), { inRoom: true, observing: true })[0] as Phenomenon;
      expect(GATEWAY_DESCRIPTORS).toContain(p.descriptor);
    }
  });
});

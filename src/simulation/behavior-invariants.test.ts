import { describe, it, expect } from 'vitest';
import { selectBehavior } from './catAI';
import { selectZone, type ZoneChoice } from './zoneSelection';
import type { Affect, Needs, Relationship } from '@core/state/catState';

/**
 * 振る舞いの不変条件（「方向こそ仕様」B5 §1.107 の機械的ロック）。
 *
 * 係数は仮値で**監修（docs/19）で数値が変わる**。だが「怖い→隠れる」「安心して空腹→食べる」等の
 * **観察可能な向き**は不変でなければならない（プレイヤーが因果を読める前提・SR-2）。ここは合成レベル
 * （selectBehavior / selectZone の argmax）で向きを固定し、監修のチューニングが向きを偶発的に反転
 * させないよう守る。rng 省略＝argmax（決定論フォールバック）で最有力を見る。
 */
const needs = (o: Partial<Needs> = {}): Needs => ({
  safety: 0.5,
  hunger: 0.2,
  elimination: 0.2,
  ...o,
});
const affect = (o: Partial<Affect> = {}): Affect => ({
  arousal: 0.3,
  valence: 0,
  vigilance: 0.3,
  stressLoad: 0.1,
  ...o,
});
const rel = (o: Partial<Relationship> = {}): Relationship => ({
  trust: 0.3,
  familiarity: 0.3,
  ...o,
});

describe('振る舞いの不変条件（監修の係数調整でも向きは不変）', () => {
  it('怖い猫（安全欲求・警戒が高い/信頼が低い）は身を守る（hiding か alert）', () => {
    const b = selectBehavior({
      needs: needs({ safety: 0.9 }),
      affect: affect({ vigilance: 0.9, stressLoad: 0.4 }),
      relationship: rel({ trust: 0.05 }),
    });
    expect(['hiding', 'alert']).toContain(b);
  });

  it('安心して空腹なら食べる（安全欲求が低く空腹が高い）', () => {
    const b = selectBehavior({
      needs: needs({ safety: 0.1, hunger: 0.9 }),
      affect: affect({ vigilance: 0.1 }),
      relationship: rel({ trust: 0.5 }),
    });
    expect(b).toBe('eating');
  });

  it('怖いと食べない（同じ空腹でも安全欲求が高いと eating を選ばない・§2.2 ゲート）', () => {
    const scaredHungry = selectBehavior({
      needs: needs({ safety: 0.9, hunger: 0.9 }),
      affect: affect({ vigilance: 0.9 }),
      relationship: rel({ trust: 0.05 }),
    });
    expect(scaredHungry).not.toBe('eating');
  });

  it('落ち着いていれば身を守る行動は選ばない（安全欲求・警戒が低い）', () => {
    const b = selectBehavior({
      needs: needs({ safety: 0.1 }),
      affect: affect({ vigilance: 0.1, arousal: 0.2 }),
      relationship: rel({ trust: 0.6, familiarity: 0.6 }),
    });
    expect(['resting', 'grooming', 'exploring']).toContain(b);
    expect(b).not.toBe('hiding');
  });

  it('hiding のときは遮蔽の効く refuge を目的地に選ぶ（移動＝行動の一部）', () => {
    const zones: ZoneChoice[] = [
      { id: 'zone.refuge', type: 'refuge', security: 0.6, comfort: 0.4 },
      { id: 'zone.open', type: 'open', security: 0.4, comfort: 0.5 },
      { id: 'zone.vantage', type: 'vantage', security: 0.5, comfort: 0.3 },
    ];
    expect(selectZone(zones, { behavior: 'hiding', prevZone: 'zone.open' })).toBe('zone.refuge');
  });

  it('安全度が高い Zone ほど選ばれやすい（他条件同一・argmax）', () => {
    const zones: ZoneChoice[] = [
      { id: 'safe', type: 'open', security: 0.9, comfort: 0.5 },
      { id: 'exposed', type: 'open', security: 0.1, comfort: 0.5 },
    ];
    expect(selectZone(zones, { behavior: 'resting', prevZone: 'x' })).toBe('safe');
  });
});

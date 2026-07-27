import { describe, it, expect } from 'vitest';
import { selectZone, zoneUtility, type ZoneChoice } from './zoneSelection';
import { createRng } from '@core/index';

const REFUGE: ZoneChoice = { id: 'zone.refuge', type: 'refuge', security: 0.7, comfort: 0.4 };
const OPEN: ZoneChoice = { id: 'zone.open', type: 'open', security: 0.3, comfort: 0.5 };
const VANTAGE: ZoneChoice = { id: 'zone.vantage', type: 'vantage', security: 0.5, comfort: 0.3 };
const ZONES = [REFUGE, OPEN, VANTAGE];

describe('Zone Selection（L2 / B6・B10 / EP-3.02）', () => {
  it('argmax（rng 省略）: hiding は遮蔽の効く refuge を選ぶ（安全＋行動適合）', () => {
    expect(selectZone(ZONES, { behavior: 'hiding', prevZone: 'zone.open' })).toBe('zone.refuge');
  });

  it('行動適合が効く: exploring は open 型へ寄る（refuge の安全と拮抗させる）', () => {
    // open の security を上げ、行動適合ボーナスで open が勝つ状況。
    const zones: ZoneChoice[] = [{ ...REFUGE, security: 0.5 }, { ...OPEN, security: 0.5 }, VANTAGE];
    expect(selectZone(zones, { behavior: 'exploring', prevZone: 'zone.vantage' })).toBe(
      'zone.open',
    );
  });

  it('現在地の慣性: 拮抗時は留まりやすい', () => {
    const flat: ZoneChoice[] = [
      { id: 'a', type: 'open', security: 0.5, comfort: 0.5 },
      { id: 'b', type: 'open', security: 0.5, comfort: 0.5 },
    ];
    // grooming は型選好なし → security/comfort 同点 → 慣性で prevZone 'b' が勝つ。
    expect(selectZone(flat, { behavior: 'grooming', prevZone: 'b' })).toBe('b');
  });

  it('候補が空なら現在地を据え置く', () => {
    expect(selectZone([], { behavior: 'resting', prevZone: 'zone.refuge' })).toBe('zone.refuge');
  });

  it('同一シードで同じ選択（決定論・softmax）', () => {
    const pick = () =>
      selectZone(ZONES, { behavior: 'exploring', prevZone: 'zone.refuge' }, createRng(42));
    expect(pick()).toBe(pick());
  });

  it('zoneUtility は安全度が高いほど大きい（他条件同一）', () => {
    const input = { behavior: 'resting' as const, prevZone: 'x' };
    const safe = zoneUtility({ id: 'a', type: 'open', security: 0.9, comfort: 0.5 }, input);
    const unsafe = zoneUtility({ id: 'b', type: 'open', security: 0.1, comfort: 0.5 }, input);
    expect(safe).toBeGreaterThan(unsafe);
  });
});

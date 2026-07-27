import { describe, it, expect } from 'vitest';
import { initialCatState, type CatState } from '@core/state/catState';
import { updateCatSegment, type SegmentContext } from './segmentUpdate';
import { effectiveUrgency, PROVISIONAL } from './catDynamics';

const inRoomCtx: SegmentContext = { day: 1, segment: 1, inRoom: true };

describe('updateCatSegment — 決定論性（B5 SR-3）', () => {
  it('同一入力から同一結果を返す（純粋・RNG 非依存）', () => {
    const s = initialCatState();
    expect(updateCatSegment(s, inRoomCtx)).toEqual(updateCatSegment(s, inRoomCtx));
  });

  it('複数 Segment 連鎖しても再現する', () => {
    const run = () => {
      let s = initialCatState();
      for (let i = 0; i < 5; i++)
        s = updateCatSegment(s, { day: 1, segment: i, inRoom: i % 2 === 0 });
      return s;
    };
    expect(run()).toEqual(run());
  });
});

describe('updateCatSegment — 値域を守る', () => {
  it('Needs/Affect/Relationship が定義域内に収まる', () => {
    let s = initialCatState();
    for (let i = 0; i < 30; i++) s = updateCatSegment(s, { day: 1, segment: i % 6, inRoom: true });
    const inRange01 = (x: number) => x >= 0 && x <= 1;
    expect(
      inRange01(s.needs.safety) && inRange01(s.needs.hunger) && inRange01(s.needs.elimination),
    ).toBe(true);
    expect(inRange01(s.affect.arousal) && inRange01(s.affect.vigilance)).toBe(true);
    expect(s.affect.valence >= -1 && s.affect.valence <= 1).toBe(true);
    expect(s.affect.stressLoad >= 0 && s.affect.stressLoad <= PROVISIONAL.stress.cap).toBe(true);
    expect(inRange01(s.relationship.trust) && inRange01(s.relationship.familiarity)).toBe(true);
  });

  it('StressLoad は上限 0.8 を超えない', () => {
    // 高 Vigilance を維持させるため stressLoad を人為的に高く始める
    let s: CatState = {
      ...initialCatState(),
      affect: { arousal: 1, valence: 0, vigilance: 1, stressLoad: 0.7 },
    };
    for (let i = 0; i < 50; i++) s = updateCatSegment(s, inRoomCtx);
    expect(s.affect.stressLoad).toBeLessThanOrEqual(0.8);
  });
});

describe('updateCatSegment — 順序と方向（§8.1）', () => {
  it('時間経過で hunger 圧が上がる（step4）', () => {
    const s = initialCatState();
    expect(updateCatSegment(s, inRoomCtx).needs.hunger).toBeGreaterThan(s.needs.hunger);
  });

  it('在室 Segment で Familiarity が微増する（step9）', () => {
    const s = initialCatState();
    const next = updateCatSegment(s, { day: 1, segment: 1, inRoom: true });
    expect(next.relationship.familiarity).toBeGreaterThan(s.relationship.familiarity);
  });

  it('不在 Segment では Familiarity が増えない', () => {
    const s = initialCatState();
    const next = updateCatSegment(s, { day: 1, segment: 2, inRoom: false });
    expect(next.relationship.familiarity).toBe(s.relationship.familiarity);
  });

  it('ZoneSecurity が高いほど安全欲求（圧）が下がる（step11）', () => {
    const s = initialCatState();
    const secure = updateCatSegment(s, {
      ...inRoomCtx,
      environment: { zoneSecurity: 0.9, zoneComfort: 0.5 },
    });
    const insecure = updateCatSegment(s, {
      ...inRoomCtx,
      environment: { zoneSecurity: 0.1, zoneComfort: 0.5 },
    });
    expect(secure.needs.safety).toBeLessThan(insecure.needs.safety);
  });

  it('Cat AI が行動を選択する（怖い初期状態→隠れる・EP-2.02 / §8.1 step14-15）', () => {
    const s = initialCatState(); // safety 高・trust 低 → hiding
    // behaviorRng 省略時は argmax（決定論）
    expect(updateCatSegment(s, inRoomCtx).behavior).toBe('hiding');
  });
});

describe('effectiveUrgency — 安全欲求が他をゲートする（§8.1 step12 / B5 §2.2）', () => {
  it('安全が切迫していると他欲求が抑制される', () => {
    const highSafety = effectiveUrgency({ safety: 0.9, hunger: 0.8, elimination: 0.8 });
    const lowSafety = effectiveUrgency({ safety: 0.1, hunger: 0.8, elimination: 0.8 });
    expect(highSafety.hunger).toBeLessThan(lowSafety.hunger);
    expect(highSafety.safety).toBe(0.9); // 安全自身はゲートされない
  });
});

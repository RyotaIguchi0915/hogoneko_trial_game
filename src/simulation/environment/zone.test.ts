import { describe, it, expect } from 'vitest';
import type { ZoneAttributes, FurnitureDef } from '@data/schemas/environment';
import { computeZoneAttributes, computeZoneSecurity, computeZoneComfort, exitScore } from './zone';

const flatBase: ZoneAttributes = {
  height: 0,
  cover: 0.1,
  exits: 1,
  sightline: 0.5,
  humanDistance: 0.3,
  trafficLevel: 0.5,
  noiseLevel: 0.4,
  lightLevel: 0.5,
  temperature: 0.5,
  softness: 0,
};

function furniture(id: string, contributions: FurnitureDef['contributions']): FurnitureDef {
  return { id, category: 'structural', labelKey: `${id}.name`, contributions };
}

describe('computeZoneAttributes — 家具寄与は加算（B10 §3.3）', () => {
  it('家具の delta を基礎属性に加算しクランプする', () => {
    const attrs = computeZoneAttributes(flatBase, [
      furniture('f.box', [
        { attribute: 'cover', delta: 0.7 }, // 0.1 + 0.7 = 0.8
        { attribute: 'exits', delta: 1 }, // 1 + 1 = 2
      ]),
    ]);
    expect(attrs.cover).toBeCloseTo(0.8);
    expect(attrs.exits).toBe(2);
  });

  it('複数家具の寄与を合算し、上限 1 でクランプ', () => {
    const attrs = computeZoneAttributes(flatBase, [
      furniture('a', [{ attribute: 'cover', delta: 0.6 }]),
      furniture('b', [{ attribute: 'cover', delta: 0.9 }]),
    ]);
    expect(attrs.cover).toBe(1); // 0.1+0.6+0.9 → clamp 1
  });
});

describe('ZoneSecurity / ZoneComfort の導出（B10 §3.3 / 保存しない）', () => {
  it('遮蔽が高く人の動線が少ない Zone ほど安全度が高い', () => {
    const refuge: ZoneAttributes = { ...flatBase, cover: 0.8, trafficLevel: 0.1 };
    const openFloor: ZoneAttributes = { ...flatBase, cover: 0.1, trafficLevel: 0.8 };
    expect(computeZoneSecurity(refuge, 0.4)).toBeGreaterThan(computeZoneSecurity(openFloor, 0.1));
  });

  it('自己臭（selfScent）は安心の加点になる', () => {
    expect(computeZoneSecurity(flatBase, 0.8)).toBeGreaterThan(computeZoneSecurity(flatBase, 0));
  });

  it('柔らかさ（softness）が快適度を上げる', () => {
    const soft: ZoneAttributes = { ...flatBase, softness: 0.8 };
    expect(computeZoneComfort(soft, 0.2)).toBeGreaterThan(computeZoneComfort(flatBase, 0.2));
  });

  it('導出値は 0..1 に収まる', () => {
    const extreme: ZoneAttributes = {
      ...flatBase,
      cover: 1,
      height: 1,
      sightline: 1,
      humanDistance: 1,
    };
    const s = computeZoneSecurity(extreme, 1);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('exitScore は逃走経路が多いほど高い（逓減）', () => {
    expect(exitScore(0)).toBe(0);
    expect(exitScore(3)).toBe(1);
    expect(exitScore(1)).toBeGreaterThan(exitScore(0));
  });
});

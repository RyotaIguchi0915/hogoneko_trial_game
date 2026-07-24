import { describe, it, expect } from 'vitest';
import type { RoomDef, FurnitureDef, ZoneAttributes } from '@data/schemas/environment';
import { EnvironmentSystem } from './EnvironmentSystem';

const base: ZoneAttributes = {
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

const box: FurnitureDef = {
  id: 'furniture.box',
  category: 'structural',
  labelKey: 'furniture.box.name',
  contributions: [{ attribute: 'cover', delta: 0.7 }],
};

function room(): RoomDef {
  return {
    id: 'room.test',
    defaultZoneId: 'zone.refuge',
    zones: [
      {
        id: 'zone.open',
        type: 'open',
        base: { ...base, cover: 0.1, trafficLevel: 0.9 },
        selfScent: 0.1,
        furniture: [],
      },
      {
        id: 'zone.refuge',
        type: 'refuge',
        base: { ...base, trafficLevel: 0.1 },
        selfScent: 0.4,
        furniture: ['furniture.box'],
      },
    ],
  };
}

const furnitureMap = new Map<string, FurnitureDef>([[box.id, box]]);

describe('EnvironmentSystem', () => {
  it('Zone ごとに環境を導出し、隠れ場所の方が安全', () => {
    const env = new EnvironmentSystem(room(), furnitureMap);
    expect(env.environmentFor('zone.refuge').security).toBeGreaterThan(
      env.environmentFor('zone.open').security,
    );
  });

  it('defaultEnvironment は既定 Zone の CatEnvironmentInput を返す', () => {
    const env = new EnvironmentSystem(room(), furnitureMap);
    const input = env.defaultEnvironment();
    expect(input.zoneSecurity).toBe(env.environmentFor('zone.refuge').security);
    expect(input.zoneSecurity).toBeGreaterThanOrEqual(0);
    expect(input.zoneComfort).toBeLessThanOrEqual(1);
  });

  it('defaultZoneId が存在しないと構築で失敗する（参照整合性）', () => {
    const bad = { ...room(), defaultZoneId: 'zone.nope' };
    expect(() => new EnvironmentSystem(bad, furnitureMap)).toThrow(/defaultZoneId/);
  });

  it('未定義の家具を参照する Zone は構築で失敗する', () => {
    expect(() => new EnvironmentSystem(room(), new Map())).toThrow(/is not defined/);
  });
});

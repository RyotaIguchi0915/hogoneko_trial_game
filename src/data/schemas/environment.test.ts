import { describe, it, expect } from 'vitest';
import { furnitureSchema, roomSchema } from './environment';

describe('furnitureSchema（B10 / B11・効果値フィールド禁止=AA-65）', () => {
  it('正しい家具定義を受理する', () => {
    const r = furnitureSchema.validate({
      id: 'furniture.cat_tower',
      category: 'structural',
      labelKey: 'furniture.cat_tower.name',
      contributions: [{ attribute: 'height', delta: 0.6 }],
    });
    expect(r.ok).toBe(true);
  });

  it('未知のカテゴリを拒否する', () => {
    const r = furnitureSchema.validate({
      id: 'f.x',
      category: 'weapon',
      labelKey: 'x',
      contributions: [],
    });
    expect(r.ok).toBe(false);
  });

  it('未知の寄与属性を拒否する（既知の物理属性のみ）', () => {
    const r = furnitureSchema.validate({
      id: 'f.x',
      category: 'comfort',
      labelKey: 'x',
      contributions: [{ attribute: 'securityBonus', delta: 0.5 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/unknown contribution attribute/);
  });
});

describe('roomSchema', () => {
  it('正しい部屋定義を受理する', () => {
    const r = roomSchema.validate({
      id: 'room.living',
      defaultZoneId: 'zone.a',
      zones: [
        {
          id: 'zone.a',
          type: 'refuge',
          selfScent: 0.3,
          furniture: [],
          base: {
            height: 0,
            cover: 0.5,
            exits: 1,
            sightline: 0.3,
            humanDistance: 0.5,
            trafficLevel: 0.2,
            noiseLevel: 0.2,
            lightLevel: 0.4,
            temperature: 0.5,
            softness: 0,
          },
        },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it('zones が空の部屋を拒否する', () => {
    const r = roomSchema.validate({ id: 'room.empty', defaultZoneId: 'z', zones: [] });
    expect(r.ok).toBe(false);
  });
});

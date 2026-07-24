import { describe, it, expect } from 'vitest';
import { phenomenonSchema, qualifierSchema } from './phenomenon';

describe('phenomenonSchema（B4 P-02 / B11 §6）', () => {
  it('正しい現象語彙を受理する', () => {
    const r = phenomenonSchema.validate({
      id: 'phenomenon.curled_resting',
      channel: 'direct',
      labelKey: 'phenomenon.curled_resting',
    });
    expect(r.ok).toBe(true);
  });

  it('未知の channel を拒否する', () => {
    const r = phenomenonSchema.validate({ id: 'p.x', channel: 'telepathy', labelKey: 'x' });
    expect(r.ok).toBe(false);
  });

  it('labelKey 欠落を拒否する（表示はキー経由・B11 §4）', () => {
    const r = phenomenonSchema.validate({ id: 'p.x', channel: 'direct' });
    expect(r.ok).toBe(false);
  });
});

describe('qualifierSchema', () => {
  it('正しい修飾語彙を受理する', () => {
    expect(
      qualifierSchema.validate({ id: 'qualifier.briefly', labelKey: 'qualifier.briefly' }).ok,
    ).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { environmentEffect, combineDelta } from './eventEffects';
import type { StateChange } from '@data/schemas/event';

const change = (command: string, params?: StateChange['params']): StateChange => ({
  target: 'environment',
  command,
  ...(params !== undefined ? { params } : {}),
});

describe('Event Effects — 発火の環境効果（仮値・B8 §2.3 / EP-2.09）', () => {
  it('遮蔽（cover）が高いほど security 増、低いほど減（方向が本質）', () => {
    expect(environmentEffect(change('setZoneCover', { cover: 0.8 })).security).toBeGreaterThan(0);
    expect(environmentEffect(change('setZoneCover', { cover: 0.1 })).security).toBeLessThan(0);
  });

  it('隠れ場所（資源）追加は security・comfort をともに上げる', () => {
    const d = environmentEffect(change('placeHideBox'));
    expect(d.security).toBeGreaterThan(0);
    expect(d.comfort).toBeGreaterThan(0);
  });

  it('高所だが遮蔽なし（cover 低）は security を下げる（弱め）', () => {
    expect(environmentEffect(change('setZoneHeightCover', { cover: 0.1 })).security).toBeLessThan(
      0,
    );
  });

  it('未知 command は無変化（0）', () => {
    expect(environmentEffect(change('unknown'))).toEqual({ security: 0, comfort: 0 });
  });

  it('combineDelta は成分ごとの加算', () => {
    expect(combineDelta({ security: 1, comfort: 2 }, { security: 3, comfort: -1 })).toEqual({
      security: 4,
      comfort: 1,
    });
  });
});

import { describe, it, expect } from 'vitest';
import { environmentEffect, mergeAttrDelta } from './eventEffects';
import type { StateChange } from '@data/schemas/event';

const change = (command: string, params?: StateChange['params']): StateChange => ({
  target: 'environment',
  command,
  ...(params !== undefined ? { params } : {}),
});

describe('Event Effects — ゾーン別属性変化（仮値・B8 §2.3 / EP-3.03）', () => {
  it('setZoneCover は対象 Zone の cover デルタを返す', () => {
    expect(environmentEffect(change('setZoneCover', { zone: 'zone.refuge', cover: 0.3 }))).toEqual({
      zoneId: 'zone.refuge',
      attrs: { cover: 0.3 },
    });
  });

  it('setZoneHeightCover は height と cover の両方を変える', () => {
    expect(
      environmentEffect(change('setZoneHeightCover', { zone: 'z', height: 0.2, cover: -0.1 })),
    ).toEqual({ zoneId: 'z', attrs: { height: 0.2, cover: -0.1 } });
  });

  it('placeHideBox は遮蔽と人との距離を上げる（隠れ箱の寄与）', () => {
    const e = environmentEffect(change('placeHideBox', { zone: 'z' }));
    expect(e?.zoneId).toBe('z');
    expect(e?.attrs.cover ?? 0).toBeGreaterThan(0);
    expect(e?.attrs.humanDistance ?? 0).toBeGreaterThan(0);
  });

  it('対象 Zone（params.zone）が無ければ効果なし（null）', () => {
    expect(environmentEffect(change('setZoneCover', { cover: 0.3 }))).toBeNull();
  });

  it('未知 command は効果なし（null）', () => {
    expect(environmentEffect(change('unknown', { zone: 'z' }))).toBeNull();
  });

  it('mergeAttrDelta は成分ごとに加算する', () => {
    expect(mergeAttrDelta({ cover: 1 }, { cover: 2, height: 3 })).toEqual({ cover: 3, height: 3 });
  });
});

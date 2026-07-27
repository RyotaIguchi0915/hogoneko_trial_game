import { describe, it, expect } from 'vitest';
import { traceForBehavior } from './trace';
import type { Behavior } from '@core/state/catState';

describe('Trace 生成 — 行動→痕跡種別（L2 / EP-2.06）', () => {
  it('活動的な行動は決定論的に痕跡を残す', () => {
    expect(traceForBehavior('grooming')).toBe('shed_fur');
    expect(traceForBehavior('exploring')).toBe('moved_object');
    expect(traceForBehavior('eating')).toBe('food_reduced');
    expect(traceForBehavior('resting')).toBe('warm_hollow');
  });

  it('潜伏・警戒は持続する痕跡を残さない（「何も見つからない」も推理材料）', () => {
    expect(traceForBehavior('hiding')).toBeNull();
    expect(traceForBehavior('alert')).toBeNull();
  });

  it('同じ行動からは常に同じ痕跡（決定論・Success 条件）', () => {
    const behaviors: Behavior[] = ['grooming', 'exploring', 'eating', 'resting', 'hiding', 'alert'];
    for (const b of behaviors) {
      expect(traceForBehavior(b)).toBe(traceForBehavior(b));
    }
  });
});

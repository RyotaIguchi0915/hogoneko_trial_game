import { describe, it, expect } from 'vitest';
import { rollStimulus, applyStimulusVigilance, STIMULUS_PROVISIONAL } from './stimulus';
import { createRng } from '@core/index';
import type { Affect } from '@core/state/catState';

const aff = (vigilance: number): Affect => ({
  arousal: 0.3,
  valence: 0,
  vigilance,
  stressLoad: 0.1,
});

describe('Stimulus — 突発刺激（B5 §8.1 step5 / EP-3.06）', () => {
  it('applyStimulusVigilance は警戒を跳ね上げる（他成分は不変）', () => {
    const spiked = applyStimulusVigilance(aff(0.2));
    expect(spiked.vigilance).toBeCloseTo(0.2 + STIMULUS_PROVISIONAL.vigilanceSpike);
    expect(spiked.stressLoad).toBe(0.1);
    expect(spiked.arousal).toBe(0.3);
  });

  it('跳ね上げは 1.0 でクランプ', () => {
    expect(applyStimulusVigilance(aff(0.9)).vigilance).toBeLessThanOrEqual(1);
  });

  it('rollStimulus は決定論的（同一シード→同一結果）', () => {
    expect(rollStimulus(createRng(1))).toBe(rollStimulus(createRng(1)));
  });

  it('rollStimulus はおよそ chance の頻度で起きる（分布）', () => {
    const n = 3000;
    let hits = 0;
    for (let i = 0; i < n; i++) if (rollStimulus(createRng(i))) hits += 1;
    const rate = hits / n;
    expect(rate).toBeGreaterThan(STIMULUS_PROVISIONAL.chance - 0.04);
    expect(rate).toBeLessThan(STIMULUS_PROVISIONAL.chance + 0.04);
  });
});

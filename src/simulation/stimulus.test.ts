import { describe, it, expect } from 'vitest';
import {
  rollStimulus,
  applyStimulusVigilance,
  stimulusSensitivity,
  STIMULUS_PROVISIONAL,
} from './stimulus';
import { createRng } from '@core/index';
import type { Affect } from '@core/state/catState';
import { NEUTRAL_PROFILE } from '@core/state/catProfile';

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

describe('個体差: 神経質さで突発音の跳ね幅が変わる（EP-4.01）', () => {
  it('神経質な子ほど感度が高く、動じない子ほど低い（中立=1.0）', () => {
    const neurotic = stimulusSensitivity({ ...NEUTRAL_PROFILE, neuroticism: 0.9 });
    const calm = stimulusSensitivity({ ...NEUTRAL_PROFILE, neuroticism: 0.1 });
    expect(stimulusSensitivity(NEUTRAL_PROFILE)).toBeCloseTo(1.0);
    expect(neurotic).toBeGreaterThan(calm);
  });

  it('感度が高いほど同じ刺激で警戒がより大きく跳ねる', () => {
    const base = aff(0.2);
    const neurotic = applyStimulusVigilance(base, 1.4).vigilance;
    const calm = applyStimulusVigilance(base, 0.6).vigilance;
    expect(neurotic).toBeGreaterThan(calm);
  });
});

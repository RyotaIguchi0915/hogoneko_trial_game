import { describe, it, expect } from 'vitest';
import { updateTrustDaily, PROVISIONAL } from './catDynamics';
import type { Affect, Relationship } from '@core/state/catState';

const rel = (trust: number, familiarity: number): Relationship => ({ trust, familiarity });
const aff = (over: Partial<Affect> = {}): Affect => ({
  arousal: 0.3,
  valence: 0,
  vigilance: 0.15,
  stressLoad: 0,
  ...over,
});

describe('updateTrustDaily — 日次 Trust 更新（B5 §8.3 / §5.2）', () => {
  it('穏やか（低警戒・低ストレス）で慣れがあると信頼が上がる', () => {
    const next = updateTrustDaily(rel(0.1, 0.6), aff({ vigilance: 0.1, stressLoad: 0 }));
    expect(next.trust).toBeGreaterThan(0.1);
    expect(next.familiarity).toBe(0.6); // familiarity は不変（別リズム）
  });

  it('ストレスが高いと信頼が即座に下がる', () => {
    expect(
      updateTrustDaily(rel(0.5, 0.6), aff({ stressLoad: 0.8, vigilance: 0.7 })).trust,
    ).toBeLessThan(0.5);
  });

  it('非対称: 満ストレスの下げ幅 > 満落ち着き・満慣れの上げ幅（gain ≪ loss）', () => {
    expect(PROVISIONAL.trustDaily.loss).toBeGreaterThan(PROVISIONAL.trustDaily.gain);
    const drop = 0.5 - updateTrustDaily(rel(0.5, 1), aff({ stressLoad: 1, vigilance: 1 })).trust;
    const rise = updateTrustDaily(rel(0.5, 1), aff({ stressLoad: 0, vigilance: 0 })).trust - 0.5;
    expect(drop).toBeGreaterThan(rise);
  });

  it('慣れが育つほど、穏やかな時間が信頼に変わりやすい', () => {
    const low = updateTrustDaily(rel(0.2, 0), aff({ vigilance: 0, stressLoad: 0 })).trust;
    const high = updateTrustDaily(rel(0.2, 1), aff({ vigilance: 0, stressLoad: 0 })).trust;
    expect(high).toBeGreaterThan(low);
  });

  it('0..1 にクランプする', () => {
    expect(
      updateTrustDaily(rel(0, 1), aff({ stressLoad: 1, vigilance: 1 })).trust,
    ).toBeGreaterThanOrEqual(0);
    expect(
      updateTrustDaily(rel(1, 1), aff({ vigilance: 0, stressLoad: 0 })).trust,
    ).toBeLessThanOrEqual(1);
  });
});

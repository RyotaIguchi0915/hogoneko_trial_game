import { describe, it, expect } from 'vitest';
import {
  updateTrustDaily,
  updateRelationship,
  needsDistress,
  updateVigilance,
  PROVISIONAL,
} from './catDynamics';
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

describe('needsDistress / 欲求不快が警戒に効く（EP-3.07）', () => {
  it('空腹が閾値以下は不快0、超えると不快が増える', () => {
    expect(needsDistress({ safety: 0, hunger: 0.3, elimination: 0 })).toBe(0); // 閾値(0.45)以下
    expect(needsDistress({ safety: 0, hunger: 0.9, elimination: 0 })).toBeGreaterThan(0);
  });

  it('欲求不快は Vigilance baseline を押し上げる（落ち着けない）', () => {
    const calm: Affect = { arousal: 0.3, valence: 0, vigilance: 0.15, stressLoad: 0 };
    expect(updateVigilance(calm, 0.4)).toBeGreaterThan(updateVigilance(calm, 0));
  });
});

describe('個体差の効き（EP-4.01）', () => {
  const calmAff: Affect = { arousal: 0.3, valence: 0, vigilance: 0.15, stressLoad: 0 };

  it('神経質な子ほど Vigilance baseline が高い（中立 0.5 で従来どおり）', () => {
    const neurotic = updateVigilance(calmAff, 0, 0.9);
    const easygoing = updateVigilance(calmAff, 0, 0.1);
    expect(neurotic).toBeGreaterThan(updateVigilance(calmAff, 0, 0.5));
    expect(updateVigilance(calmAff, 0, 0.5)).toBeGreaterThan(easygoing);
  });

  it('社会性が高い子ほど穏やかな日の Trust の伸びが大きい', () => {
    const r = rel(0.2, 0.6);
    const social = updateTrustDaily(r, calmAff, 1, 0.9).trust;
    const aloof = updateTrustDaily(r, calmAff, 1, 0.1).trust;
    expect(social).toBeGreaterThan(aloof);
  });

  it('社会性が高い子ほど在室で Familiarity が育ちやすい', () => {
    const r = rel(0.2, 0.3);
    const social = updateRelationship(r, true, 1, 0.9).familiarity;
    const aloof = updateRelationship(r, true, 1, 0.1).familiarity;
    expect(social).toBeGreaterThan(aloof);
  });

  it('ストレスによる Trust 低下は個体差に依らない（誰でも崩れる・非対称）', () => {
    const stressed: Affect = { arousal: 0.5, valence: -0.3, vigilance: 0.6, stressLoad: 0.5 };
    const r = rel(0.4, 0.5);
    const social = updateTrustDaily(r, stressed, 1, 0.9).trust;
    const aloof = updateTrustDaily(r, stressed, 1, 0.1).trust;
    // 低下局面では social の方が rise 分だけわずかに上だが、両者とも t0 から下がる。
    expect(social).toBeLessThan(r.trust);
    expect(aloof).toBeLessThan(r.trust);
  });
});

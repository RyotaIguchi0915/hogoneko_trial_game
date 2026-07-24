import type { ZoneAttributes, AttributeName, FurnitureDef } from '@data/schemas/environment';
import { clamp01 } from '../catDynamics';

/**
 * Zone 計算（L2 Simulation / B10 §3.3）
 *
 * 家具の寄与は基礎属性への加算（`Zone.attribute += Σ furniture.contribution`）。
 * ZoneSecurity / ZoneComfort は**保存せず導出**する（AA-31）。重みは個体プロファイルで
 * 変動しうる（SR-5）が、MVP では固定の仮値を使う（監修・実測で確定）。
 */

/** ZoneSecurity / ZoneComfort の仮の重み（監修待ち・SR-5 で個体別化）。 */
export const ZONE_WEIGHTS = {
  security: {
    cover: 0.25,
    height: 0.15,
    exits: 0.15,
    sightline: 0.1,
    humanDistance: 0.15,
    traffic: 0.2,
    noise: 0.15,
    selfScent: 0.15,
  },
  comfort: { thermal: 0.3, light: 0.2, softness: 0.35, selfScent: 0.15 },
} as const;

/** 逃走経路スコア（多いほど安全・逓減）。 */
export function exitScore(exits: number): number {
  return clamp01(exits / 3);
}
/** 温度適合（やや暖かめが快・仮のピーク 0.65）。 */
export function thermalFit(temperature: number): number {
  return clamp01(1 - Math.abs(temperature - 0.65) * 1.5);
}
/** 照度適合（中程度が快・仮のピーク 0.5）。 */
export function lightFit(lightLevel: number): number {
  return clamp01(1 - Math.abs(lightLevel - 0.5) * 1.5);
}

/** 基礎属性 + 家具寄与（加算）。値域でクランプ（exits は非負整数化）。 */
export function computeZoneAttributes(
  base: ZoneAttributes,
  furniture: readonly FurnitureDef[],
): ZoneAttributes {
  const acc: Record<AttributeName, number> = { ...base };
  for (const f of furniture) {
    for (const c of f.contributions) {
      acc[c.attribute] += c.delta;
    }
  }
  return {
    height: clamp01(acc.height),
    cover: clamp01(acc.cover),
    exits: Math.max(0, Math.round(acc.exits)),
    sightline: clamp01(acc.sightline),
    humanDistance: clamp01(acc.humanDistance),
    trafficLevel: clamp01(acc.trafficLevel),
    noiseLevel: clamp01(acc.noiseLevel),
    lightLevel: clamp01(acc.lightLevel),
    temperature: clamp01(acc.temperature),
    softness: clamp01(acc.softness),
  };
}

/** ZoneSecurity（安全度・B10 §3.3）。selfScent は自己臭＝安心の加点。 */
export function computeZoneSecurity(attrs: ZoneAttributes, selfScent: number): number {
  const w = ZONE_WEIGHTS.security;
  return clamp01(
    w.cover * attrs.cover +
      w.height * attrs.height +
      w.exits * exitScore(attrs.exits) +
      w.sightline * attrs.sightline +
      w.humanDistance * attrs.humanDistance -
      w.traffic * attrs.trafficLevel -
      w.noise * attrs.noiseLevel +
      w.selfScent * selfScent,
  );
}

/** ZoneComfort（快適度・B10 §3.3）。 */
export function computeZoneComfort(attrs: ZoneAttributes, selfScent: number): number {
  const w = ZONE_WEIGHTS.comfort;
  return clamp01(
    w.thermal * thermalFit(attrs.temperature) +
      w.light * lightFit(attrs.lightLevel) +
      w.softness * attrs.softness +
      w.selfScent * selfScent,
  );
}

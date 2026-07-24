import { describe, it, expect } from 'vitest';
import { buildDefaultEnvironment } from './environment';

describe('buildDefaultEnvironment（EP-2.03 配線）', () => {
  it('サンプル content が strict 検証を通り、EnvironmentSystem を構築できる', () => {
    expect(() => buildDefaultEnvironment()).not.toThrow();
  });

  it('既定 Zone（refuge）の環境入力が値域に収まる', () => {
    const env = buildDefaultEnvironment();
    const input = env.defaultEnvironment();
    expect(input.zoneSecurity).toBeGreaterThanOrEqual(0);
    expect(input.zoneSecurity).toBeLessThanOrEqual(1);
    expect(input.zoneComfort).toBeGreaterThanOrEqual(0);
    expect(input.zoneComfort).toBeLessThanOrEqual(1);
  });

  it('隠れ場所（refuge）は開けた床（open_floor）より安全', () => {
    const env = buildDefaultEnvironment();
    expect(env.environmentFor('zone.refuge').security).toBeGreaterThan(
      env.environmentFor('zone.open_floor').security,
    );
  });
});

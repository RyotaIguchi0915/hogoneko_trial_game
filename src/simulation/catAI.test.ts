import { describe, it, expect } from 'vitest';
import { createRng } from '@core/index';
import type { Behavior } from '@core/state/catState';
import {
  behaviorUtilities,
  selectBehavior,
  BEHAVIOR_CANDIDATES,
  type BehaviorInput,
} from './catAI';

function input(overrides: {
  needs?: Partial<BehaviorInput['needs']>;
  affect?: Partial<BehaviorInput['affect']>;
  relationship?: Partial<BehaviorInput['relationship']>;
}): BehaviorInput {
  return {
    needs: { safety: 0.2, hunger: 0.2, elimination: 0.2, ...overrides.needs },
    affect: { arousal: 0.3, valence: 0, vigilance: 0.2, stressLoad: 0.2, ...overrides.affect },
    relationship: { trust: 0.2, familiarity: 0.3, ...overrides.relationship },
  };
}

function argmax(u: Record<Behavior, number>): Behavior {
  return BEHAVIOR_CANDIDATES.reduce(
    (best, b) => (u[b] > u[best] ? b : best),
    BEHAVIOR_CANDIDATES[0]!,
  );
}

describe('behaviorUtility — 状態が行動を決める（B6 §2.4・方向のみ）', () => {
  it('怖い/警戒が高く信頼が低いと「隠れる」が最上位', () => {
    const u = behaviorUtilities(
      input({ needs: { safety: 0.85 }, affect: { vigilance: 0.7 }, relationship: { trust: 0.05 } }),
    );
    expect(argmax(u)).toBe('hiding');
  });

  it('空腹かつ安全なら「食べる」が最上位（安全欲求がゲート・B5 §2.2）', () => {
    const u = behaviorUtilities(input({ needs: { hunger: 0.9, safety: 0.1 } }));
    expect(argmax(u)).toBe('eating');
  });

  it('落ち着いていれば隠れない（休む/毛づくろい/探索のいずれか）', () => {
    const u = behaviorUtilities(
      input({
        needs: { safety: 0.1, hunger: 0.15 },
        affect: { vigilance: 0.1, arousal: 0.2 },
        relationship: { familiarity: 0.5, trust: 0.4 },
      }),
    );
    expect(['resting', 'grooming', 'exploring']).toContain(argmax(u));
    expect(argmax(u)).not.toBe('hiding');
  });
});

describe('selectBehavior — 決定論と妥当性（B6 §2.5 / B5 SR-3）', () => {
  const scared = input({
    needs: { safety: 0.85 },
    affect: { vigilance: 0.7 },
    relationship: { trust: 0.05 },
  });

  it('同一シード・同一状態なら同一行動（決定論）', () => {
    expect(selectBehavior(scared, createRng(42))).toBe(selectBehavior(scared, createRng(42)));
  });

  it('常に候補のいずれかを返す', () => {
    const rng = createRng(7);
    for (let i = 0; i < 20; i++) {
      expect(BEHAVIOR_CANDIDATES).toContain(selectBehavior(scared, rng));
    }
  });

  it('RNG 省略時は argmax（怖い状態→隠れる）', () => {
    expect(selectBehavior(scared)).toBe('hiding');
  });

  it('softmax は最上位に偏る（怖い猫はほぼ隠れる）', () => {
    const rng = createRng(123);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const b = selectBehavior(scared, rng);
      counts[b] = (counts[b] ?? 0) + 1;
    }
    expect(counts.hiding ?? 0).toBeGreaterThan(100); // 過半数は隠れる（τ=0.15）
  });
});

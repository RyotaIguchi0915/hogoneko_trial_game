import { describe, it, expect } from 'vitest';
import {
  serialize,
  computeChecksum,
  validateStructure,
  verifyChecksum,
  migrate,
  CURRENT_SCHEMA_VERSION,
  type GameSnapshot,
} from './SaveData';
import { initialCatState } from '../state/catState';

function sampleSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    determinism: { seed: 42, streamState: 42 },
    progress: { day: 1, segment: 0, phase: 'running' },
    gamePhase: 'playing',
    simulation: { cat: initialCatState() },
    ...overrides,
  };
}

describe('SaveData — checksum', () => {
  it('同一 Snapshot は同一チェックサムを返す（決定論）', () => {
    expect(computeChecksum(sampleSnapshot())).toBe(computeChecksum(sampleSnapshot()));
  });

  it('キー順が違っても同一チェックサム（安定シリアライズ）', () => {
    const cat = initialCatState();
    const a: GameSnapshot = {
      determinism: { seed: 1, streamState: 2 },
      progress: { day: 3, segment: 2, phase: 'running' },
      gamePhase: 'playing',
      simulation: { cat },
    };
    // 意味的に同一だが構築順が異なるオブジェクト
    const b = {
      simulation: { cat },
      gamePhase: 'playing',
      progress: { phase: 'running', segment: 2, day: 3 },
      determinism: { streamState: 2, seed: 1 },
    } as unknown as GameSnapshot;
    expect(computeChecksum(a)).toBe(computeChecksum(b));
  });

  it('値が変われば別のチェックサム', () => {
    const base = computeChecksum(sampleSnapshot());
    const changed = computeChecksum(
      sampleSnapshot({ progress: { day: 2, segment: 0, phase: 'running' } }),
    );
    expect(changed).not.toBe(base);
  });
});

describe('SaveData — serialize / verify', () => {
  it('serialize は現行スキーマ版と一致するチェックサムを埋め込む', () => {
    const save = serialize(sampleSnapshot(), 1000, '0.1.0');
    expect(save.meta.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(save.meta.savedAt).toBe(1000);
    expect(save.meta.buildVersion).toBe('0.1.0');
    expect(verifyChecksum(save)).toBe(true);
  });

  it('data を改竄するとチェックサム検証が落ちる', () => {
    const save = serialize(sampleSnapshot(), 1000, '0.1.0');
    const tampered = { ...save, data: { ...save.data, gamePhase: 'title' as const } };
    expect(verifyChecksum(tampered)).toBe(false);
  });
});

describe('SaveData — validateStructure', () => {
  it('正しい保存構造を受理する', () => {
    const save = serialize(sampleSnapshot(), 1, 'x');
    expect(validateStructure(save)).toEqual({ valid: true, errors: [] });
  });

  it('Day が範囲外（>30）を検出する', () => {
    const save = serialize(
      sampleSnapshot({ progress: { day: 31, segment: 0, phase: 'running' } }),
      1,
      'x',
    );
    const result = validateStructure(save);
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toMatch(/day out of range/);
  });

  it('必須フィールド欠落（cat 不正）を検出する', () => {
    const broken = {
      meta: { schemaVersion: 1, checksum: 'x' },
      data: {
        determinism: { seed: 1, streamState: 1 },
        progress: { day: 1, segment: 0, phase: 'running' },
        gamePhase: 'playing',
        simulation: {},
      },
    };
    const result = validateStructure(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toMatch(/cat is invalid/);
  });

  it('非オブジェクトを拒否する', () => {
    expect(validateStructure(null).valid).toBe(false);
    expect(validateStructure('nope').valid).toBe(false);
  });
});

describe('SaveData — migrate', () => {
  it('現行版はそのまま通す', () => {
    const raw = { meta: { schemaVersion: CURRENT_SCHEMA_VERSION } } as Record<string, unknown>;
    const result = migrate(raw, CURRENT_SCHEMA_VERSION);
    expect(result.ok).toBe(true);
  });

  it('未来の版は復元不可（一方向・B4 §9.6）', () => {
    const result = migrate({}, CURRENT_SCHEMA_VERSION + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/newer than supported/);
  });

  it('移行関数が無い旧版は復元不可（無言のデータ破壊を避ける）', () => {
    // schema 0 → 現行 への移行関数は未登録
    const result = migrate({}, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/no migration/);
  });
});

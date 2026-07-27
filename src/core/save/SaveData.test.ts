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

  it('互換性のない cat（needs/affect 欠落の旧形式）を拒否する（EP-2.02 回帰防止）', () => {
    const save = serialize(
      { ...sampleSnapshot(), simulation: { cat: { arrived: false } } } as unknown as GameSnapshot,
      1,
      'x',
    );
    const result = validateStructure(save);
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toMatch(/cat\.needs is invalid/);
  });

  it('observationLog 欠落（旧セーブ）は受理する（後方互換・B4 §9.6）', () => {
    const save = serialize(sampleSnapshot(), 1, 'x'); // observationLog を持たない
    expect('observationLog' in save.data).toBe(false);
    expect(validateStructure(save).valid).toBe(true);
  });

  it('observationLog があり配列なら受理し、非配列は拒否する', () => {
    const withLog = serialize(
      sampleSnapshot({ observationLog: [{ day: 1, segment: 1, subject: 'cat', descriptor: 'x' }] }),
      1,
      'x',
    );
    expect(validateStructure(withLog).valid).toBe(true);

    const broken = serialize(
      sampleSnapshot({ observationLog: 'nope' as unknown as readonly [] }),
      1,
      'x',
    );
    const result = validateStructure(broken);
    expect(result.valid).toBe(false);
    expect(result.errors.join()).toMatch(/observationLog is invalid/);
  });

  it('traces 欠落（旧セーブ）は受理し、配列なら受理・非配列は拒否する（EP-2.06 後方互換）', () => {
    const withoutTraces = serialize(sampleSnapshot(), 1, 'x');
    expect('traces' in withoutTraces.data).toBe(false);
    expect(validateStructure(withoutTraces).valid).toBe(true);

    const withTraces = serialize(sampleSnapshot({ traces: [{ kind: 'shed_fur' }] }), 1, 'x');
    expect(validateStructure(withTraces).valid).toBe(true);

    const broken = serialize(sampleSnapshot({ traces: 'nope' as unknown as readonly [] }), 1, 'x');
    expect(validateStructure(broken).errors.join()).toMatch(/traces is invalid/);
  });

  it('firedEventIds / envAdjust 欠落は受理し、配列/数値2項なら受理・不正は拒否（EP-2.09 後方互換）', () => {
    expect(validateStructure(serialize(sampleSnapshot(), 1, 'x')).valid).toBe(true); // 欠落OK
    const withEvent = serialize(
      sampleSnapshot({ firedEventIds: ['e1'], envAdjust: { security: 0.1, comfort: -0.2 } }),
      1,
      'x',
    );
    expect(validateStructure(withEvent).valid).toBe(true);

    const badIds = serialize(
      sampleSnapshot({ firedEventIds: 'nope' as unknown as readonly string[] }),
      1,
      'x',
    );
    expect(validateStructure(badIds).errors.join()).toMatch(/firedEventIds is invalid/);

    const badAdj = serialize(
      sampleSnapshot({
        envAdjust: { security: 'x' } as unknown as { security: number; comfort: number },
      }),
      1,
      'x',
    );
    expect(validateStructure(badAdj).errors.join()).toMatch(/envAdjust is invalid/);
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

describe('SaveData — migrate v1→v2（Sprint1→2 スキーマ移行・EP-2.11）', () => {
  it('Sprint1 の最小 cat（arrived のみ）を全形へ補完し、観察履歴・痕跡を足す', () => {
    const v1 = {
      meta: { schemaVersion: 1, checksum: 'x', savedAt: 1, buildVersion: 'x' },
      data: {
        determinism: { seed: 1, streamState: 1 },
        progress: { day: 2, segment: 1, phase: 'running' },
        gamePhase: 'playing',
        simulation: { cat: { arrived: true } }, // Sprint1 骨格
      },
    } as Record<string, unknown>;

    const result = migrate(v1, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 移行後は現行スキーマとして構造検証を通る（全形 cat + 配列フィールド）。
    expect(validateStructure(result.value).valid).toBe(true);
    const data = result.value.data as Record<string, any>;
    expect(data.simulation.cat.arrived).toBe(true); // 保全
    expect(typeof data.simulation.cat.needs.hunger).toBe('number'); // 補完
    expect(data.observationLog).toEqual([]);
    expect(data.traces).toEqual([]);
    expect((result.value.meta as Record<string, unknown>).schemaVersion).toBe(2);
    // 進行など他の元データは保全される。
    expect(data.progress).toEqual({ day: 2, segment: 1, phase: 'running' });
  });

  it('既に妥当な値（Sprint2 を v1 として保存した実データ）は初期値で上書きしない（データ喪失防止）', () => {
    const cat = { ...initialCatState(), relationship: { trust: 0.42, familiarity: 0.37 } };
    const v1 = {
      meta: { schemaVersion: 1, checksum: 'x', savedAt: 1, buildVersion: 'x' },
      data: {
        determinism: { seed: 9, streamState: 3 },
        progress: { day: 5, segment: 3, phase: 'running' },
        gamePhase: 'playing',
        simulation: { cat },
        observationLog: [{ day: 1, segment: 1, subject: 'cat', descriptor: 'x' }],
        traces: [{ kind: 'shed_fur' }],
      },
    } as Record<string, unknown>;

    const result = migrate(v1, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.value.data as Record<string, any>;
    expect(data.simulation.cat.relationship).toEqual({ trust: 0.42, familiarity: 0.37 }); // 保全
    expect(data.observationLog).toHaveLength(1); // 保全
    expect(data.traces).toEqual([{ kind: 'shed_fur' }]); // 保全
  });
});

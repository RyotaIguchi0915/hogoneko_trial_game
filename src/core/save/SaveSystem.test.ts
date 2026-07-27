import { describe, it, expect } from 'vitest';
import { createEventBus } from '../events/EventBus';
import { SaveSystem, SaveEvents } from './SaveSystem';
import { createMemorySaveStorage, type SaveStorage } from './SaveStorage';
import { computeChecksum, type GameSnapshot } from './SaveData';
import { initialCatState } from '../state/catState';

const SLOT = 'slot';
const BACKUP = 'slot.bak';

function snap(day: number, arrived = false): GameSnapshot {
  return {
    determinism: { seed: 7, streamState: 7 + day },
    progress: { day, segment: 0, phase: 'running' },
    gamePhase: 'playing',
    simulation: { cat: { ...initialCatState(), arrived } },
  };
}

function makeSystem(storage: SaveStorage, now = 1000) {
  const bus = createEventBus();
  const system = new SaveSystem(storage, () => now, bus, { slotKey: SLOT, buildVersion: '0.1.0' });
  return { bus, system };
}

describe('SaveSystem — round trip（AQ086〜091）', () => {
  it('保存 → 復元で Snapshot が一致する', () => {
    const storage = createMemorySaveStorage();
    const { system } = makeSystem(storage, 1234);

    const written = system.write(snap(3, true));
    expect(written).toEqual({ ok: true, savedAt: 1234 });

    const restored = system.read();
    expect(restored.status).toBe('ok');
    if (restored.status === 'ok') {
      expect(restored.snapshot).toEqual(snap(3, true));
      expect(restored.savedAt).toBe(1234);
    }
  });

  it('別インスタンスからでも復元できる（永続の分離）', () => {
    const storage = createMemorySaveStorage();
    makeSystem(storage).system.write(snap(5));
    const fresh = makeSystem(storage).system.read();
    expect(fresh.status).toBe('ok');
  });
});

describe('SaveSystem — 空スロット', () => {
  it('保存が無ければ empty を返す', () => {
    const { system } = makeSystem(createMemorySaveStorage());
    expect(system.read()).toEqual({ status: 'empty' });
  });
});

describe('SaveSystem — 実データ往復（観察履歴・痕跡込み・EP-2.11）', () => {
  it('Persisted 全項目（cat/観察履歴/痕跡）が往復で一致する', () => {
    const storage = createMemorySaveStorage();
    const { system } = makeSystem(storage, 4242);
    const rich: GameSnapshot = {
      determinism: { seed: 3, streamState: 12 },
      progress: { day: 4, segment: 3, phase: 'running' },
      gamePhase: 'playing',
      simulation: { cat: { ...initialCatState(), arrived: true } },
      observationLog: [
        { day: 1, segment: 1, subject: 'cat', descriptor: 'phenomenon.curled_resting' },
        { day: 1, segment: 3, subject: 'trace', descriptor: 'phenomenon.shed_fur' },
      ],
      traces: [{ kind: 'moved_object' }],
    };
    expect(system.write(rich).ok).toBe(true);
    const restored = system.read();
    expect(restored.status).toBe('ok');
    if (restored.status === 'ok') expect(restored.snapshot).toEqual(rich);
  });
});

describe('SaveSystem — v1 セーブの移行復元（Sprint1→2・EP-2.11）', () => {
  it('checksum は原本で検証してから移行し、全形 cat で復元する', () => {
    const storage = createMemorySaveStorage();
    const { system } = makeSystem(storage);
    // 正しいチェックサムを持つ v1 セーブ（Sprint1 骨格 cat）を仕込む。
    const v1data = {
      determinism: { seed: 1, streamState: 1 },
      progress: { day: 3, segment: 1, phase: 'running' },
      gamePhase: 'playing',
      simulation: { cat: { arrived: true } },
    };
    const v1 = {
      meta: {
        schemaVersion: 1,
        savedAt: 100,
        checksum: computeChecksum(v1data as unknown as GameSnapshot),
        buildVersion: 'old',
      },
      data: v1data,
    };
    storage.write(SLOT, JSON.stringify(v1));

    const restored = system.read();
    expect(restored.status).toBe('ok'); // 移行して復元できる（拒否ではない）
    if (restored.status === 'ok') {
      expect(restored.snapshot.simulation.cat.arrived).toBe(true); // 保全
      expect(typeof restored.snapshot.simulation.cat.needs.hunger).toBe('number'); // 補完
      expect(restored.snapshot.progress.day).toBe(3);
      expect(restored.snapshot.observationLog).toEqual([]);
      expect(restored.snapshot.traces).toEqual([]);
    }
  });

  it('v1 セーブでも改竄（checksum 不一致）は移行前に検出して拒否する', () => {
    const storage = createMemorySaveStorage();
    const { system } = makeSystem(storage);
    const v1data = {
      determinism: { seed: 1, streamState: 1 },
      progress: { day: 3, segment: 1, phase: 'running' },
      gamePhase: 'playing',
      simulation: { cat: { arrived: true } },
    };
    const v1 = {
      meta: { schemaVersion: 1, savedAt: 100, checksum: 'deadbeef', buildVersion: 'old' }, // 不正
      data: v1data,
    };
    storage.write(SLOT, JSON.stringify(v1));
    expect(system.read().status).toBe('unrecoverable');
  });
});

describe('SaveSystem — 保存成功の通知', () => {
  it('saved イベントを発行する', () => {
    const storage = createMemorySaveStorage();
    const { system, bus } = makeSystem(storage, 999);
    const saved: number[] = [];
    bus.on(SaveEvents.saved, (p) => saved.push(p.savedAt));
    system.write(snap(1));
    expect(saved).toEqual([999]);
  });
});

describe('SaveSystem — 破損時のバックアップ縮退（B4 §11.3）', () => {
  it('メイン破損時はバックアップから復元する', () => {
    const storage = createMemorySaveStorage();
    const { system } = makeSystem(storage);

    system.write(snap(1)); // main=Day1
    system.write(snap(2)); // backup=Day1, main=Day2

    // メインを破壊
    storage.write(SLOT, '{ not valid json');

    const restored = system.read();
    expect(restored.status).toBe('recovered');
    if (restored.status === 'recovered') {
      expect(restored.snapshot.progress.day).toBe(1); // バックアップ=Day1
      expect(restored.reason).toMatch(/recovered from backup/);
    }
  });

  it('メイン・バックアップ双方が破損なら unrecoverable', () => {
    const storage = createMemorySaveStorage();
    const { system, bus } = makeSystem(storage);
    system.write(snap(1));
    system.write(snap(2));
    storage.write(SLOT, 'garbage');
    storage.write(BACKUP, 'garbage');

    const degraded: string[] = [];
    bus.on(SaveEvents.restoreDegraded, (p) => degraded.push(p.status));

    const restored = system.read();
    expect(restored.status).toBe('unrecoverable');
    expect(degraded).toContain('unrecoverable');
  });

  it('チェックサム不一致（改竄）を検出しバックアップへ縮退する', () => {
    const storage = createMemorySaveStorage();
    const { system } = makeSystem(storage);
    system.write(snap(1));
    system.write(snap(2));

    // main の data を書き換えるが checksum は据え置き → 不一致
    const raw = JSON.parse(storage.read(SLOT) as string);
    raw.data.progress.day = 9;
    storage.write(SLOT, JSON.stringify(raw));

    const restored = system.read();
    expect(restored.status).toBe('recovered');
  });
});

describe('SaveSystem — 保存失敗の検出（AA-75 / B4 §9.7）', () => {
  it('ストレージ書込例外を握りつぶさず、結果と saveFailed で通知する', () => {
    const failing: SaveStorage = {
      read: () => null,
      write: () => {
        throw new Error('quota exceeded');
      },
      remove: () => {},
    };
    const { system, bus } = makeSystem(failing);
    const failures: string[] = [];
    bus.on(SaveEvents.saveFailed, (p) => failures.push(p.reason));

    const result = system.write(snap(1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/quota exceeded/);
    expect(failures).toEqual(['quota exceeded']);
  });
});

import type { GameModule } from '../module/GameModule';
import { defineChannel, type EventBus } from '../events/EventBus';
import type { SaveStorage } from './SaveStorage';
import {
  serialize,
  validateStructure,
  verifyChecksum,
  migrate,
  CURRENT_SCHEMA_VERSION,
  type GameSnapshot,
  type SaveData,
} from './SaveData';

/**
 * Save System — 永続化・復元・整合性検証・移行の統括（L1 Core / B4 C-06・⑨）
 *
 * 責務（B4 §9）:
 *   - 1スロットのみ（複数スロット禁止・Pillar 4 / AP-08）
 *   - 自動保存（手動セーブ/ロード API を公開しない）
 *   - チェックサム検証・構造検証・スキーマ移行
 *   - 破損時は 1世代バックアップから縮退復元（B4 §11.3）
 *   - 保存失敗を握りつぶさず検出・通知（AA-75 / B4 §9.7）
 *
 * ⚠️ savedAt（壁時計）は Clock 注入で受け取る。Core は Date を直接使わない（AD-38 / 決定論）。
 * ⚠️ 復元は「再構築」であり「巻き戻し」ではない（Pillar 4）。ロード API は起動時のみ意味を持つ。
 */

/** 壁時計の抽象。L4 が Date.now を注入する。テストは固定値を注入する。 */
export type Clock = () => number;

export const SaveEvents = {
  /** 保存に成功した（savedAt を載せる）。 */
  saved: defineChannel<{ readonly savedAt: number }>('save/saved'),
  /** 保存に失敗した（AA-75: 無言で握りつぶさない）。 */
  saveFailed: defineChannel<{ readonly reason: string }>('save/saveFailed'),
  /** 復元がメイン以外の経路になった（縮退・新規提案）。 */
  restoreDegraded: defineChannel<{ readonly status: RestoreStatus; readonly reason: string }>(
    'save/restoreDegraded',
  ),
} as const;

export type SaveResult =
  | { readonly ok: true; readonly savedAt: number }
  | { readonly ok: false; readonly reason: string };

export type RestoreStatus = 'ok' | 'empty' | 'recovered' | 'unrecoverable';

export type RestoreResult =
  | { readonly status: 'ok'; readonly snapshot: GameSnapshot; readonly savedAt: number }
  | { readonly status: 'recovered'; readonly snapshot: GameSnapshot; readonly savedAt: number; readonly reason: string }
  | { readonly status: 'empty' }
  | { readonly status: 'unrecoverable'; readonly reason: string };

export interface SaveSystemOptions {
  /** スロットのストレージキー。1スロットのみ（AP-08）。 */
  readonly slotKey?: string;
  readonly buildVersion?: string;
}

const DEFAULT_SLOT_KEY = 'hogoneko/save/v1';

export class SaveSystem implements GameModule {
  readonly id = 'core.save';

  readonly #storage: SaveStorage;
  readonly #clock: Clock;
  readonly #bus: EventBus;
  readonly #mainKey: string;
  readonly #backupKey: string;
  readonly #buildVersion: string;

  constructor(storage: SaveStorage, clock: Clock, bus: EventBus, options: SaveSystemOptions = {}) {
    this.#storage = storage;
    this.#clock = clock;
    this.#bus = bus;
    this.#mainKey = options.slotKey ?? DEFAULT_SLOT_KEY;
    this.#backupKey = `${this.#mainKey}.bak`;
    this.#buildVersion = options.buildVersion ?? '0.0.0';
  }

  /**
   * Snapshot を保存する。失敗しても例外を投げず結果で返し、必ず通知する（AA-75）。
   * 書込前に現行メインを 1世代バックアップへ退避する（B4 §11.3 バックアップ方針）。
   */
  write(snapshot: GameSnapshot): SaveResult {
    const savedAt = this.#clock();
    const save = serialize(snapshot, savedAt, this.#buildVersion);
    const encoded = JSON.stringify(save);

    try {
      // メイン成功前に現行メインをバックアップへ退避（1世代のみ・巻き戻し手段にしない）。
      const currentMain = this.#storage.read(this.#mainKey);
      if (currentMain !== null) {
        this.#storage.write(this.#backupKey, currentMain);
      }
      this.#storage.write(this.#mainKey, encoded);
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'unknown storage error';
      this.#bus.emit(SaveEvents.saveFailed, { reason });
      return { ok: false, reason };
    }

    this.#bus.emit(SaveEvents.saved, { savedAt });
    return { ok: true, savedAt };
  }

  /**
   * スロットを復元する。メイン破損時はバックアップから縮退復元する（B4 §11.3）。
   * どちらも復元できなければ 'unrecoverable'（新規開始の提案は上位が担う）。
   */
  read(): RestoreResult {
    const main = this.#storage.read(this.#mainKey);
    if (main === null) {
      return { status: 'empty' };
    }

    const decodedMain = this.#decode(main);
    if (decodedMain.ok) {
      return { status: 'ok', snapshot: decodedMain.save.data, savedAt: decodedMain.save.meta.savedAt };
    }

    // メインが読めない → バックアップへ縮退（B4 §11.3）。
    const backup = this.#storage.read(this.#backupKey);
    if (backup !== null) {
      const decodedBackup = this.#decode(backup);
      if (decodedBackup.ok) {
        const reason = `main slot unreadable (${decodedMain.reason}); recovered from backup`;
        this.#bus.emit(SaveEvents.restoreDegraded, { status: 'recovered', reason });
        return {
          status: 'recovered',
          snapshot: decodedBackup.save.data,
          savedAt: decodedBackup.save.meta.savedAt,
          reason,
        };
      }
    }

    const reason = `save unrecoverable: ${decodedMain.reason}`;
    this.#bus.emit(SaveEvents.restoreDegraded, { status: 'unrecoverable', reason });
    return { status: 'unrecoverable', reason };
  }

  /** スロットを消す（新規開始の確定時など）。 */
  clear(): void {
    this.#storage.remove(this.#mainKey);
    this.#storage.remove(this.#backupKey);
  }

  /** 生の文字列を検証済み SaveData へ。移行 → チェックサム → 構造の順で確認する。 */
  #decode(raw: string): { ok: true; save: SaveData } | { ok: false; reason: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, reason: 'not valid JSON' };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { ok: false, reason: 'not an object' };
    }
    const root = parsed as Record<string, unknown>;
    const meta = root.meta as Record<string, unknown> | undefined;
    const version = typeof meta?.schemaVersion === 'number' ? meta.schemaVersion : NaN;
    if (Number.isNaN(version)) {
      return { ok: false, reason: 'missing schema version' };
    }

    // マイグレーション（B4 §9.6）。
    if (version !== CURRENT_SCHEMA_VERSION) {
      const migrated = migrate(root, version);
      if (!migrated.ok) {
        return { ok: false, reason: migrated.reason };
      }
      parsed = migrated.value;
    }

    const structure = validateStructure(parsed);
    if (!structure.valid) {
      return { ok: false, reason: `structure invalid: ${structure.errors.join('; ')}` };
    }

    const save = parsed as SaveData;
    if (!verifyChecksum(save)) {
      return { ok: false, reason: 'checksum mismatch' };
    }

    return { ok: true, save };
  }
}

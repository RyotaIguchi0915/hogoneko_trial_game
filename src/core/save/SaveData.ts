import type { TrialPhase } from '../time/TimeState';
import type { GamePhase } from '../state/gamePhase';
import type { CatState } from '../state/catState';
import { initialCatState } from '../state/catState';
import type { ObservationEntry } from '../state/observation';
import type { Trace } from '../state/trace';

/**
 * Save Data — 保存対象の分類・構造・整合性・移行（L1 Core / B4 ⑨）
 *
 * ここは Functional Core（DevConst §5.1）。純粋関数のみ。
 * 副作用（ストレージ I/O・時刻取得）は SaveSystem（Imperative Shell）が担う。
 *
 * ⚠️ 保存する（Persisted）のは「元データ」だけ（B4 §9.2）。
 *    派生値（Player Knowledge・評価キャッシュ・描写解像度）は保存せず再生成する。
 * ⚠️ 表示テキスト・Phenomenon・Content Definition は保存しない（B4 §9.7）。
 *
 * 【Sprint 1 の範囲】
 *   B11 Data Architecture Bible（未作成 / OI-2）が具体スキーマを確定するまで、
 *   本 Snapshot は「現時点で実在する元データ」のみを持つ骨格である。
 *   Environment / Trace / 観測履歴 / Record / Event State 等のフィールドは
 *   Sprint 2 以降に GameSnapshot を拡張して充填する（フィールド追加は 9.6 マイグレーションで吸収）。
 */

/**
 * 現在のスキーマ版。破壊的変更のたびに +1 し、旧版へのマイグレーションを追加する。
 * v1 = Sprint1 骨格（cat={arrived} のみ）。v2 = Sprint2（Cat State 全形 + 観察履歴 + 痕跡）。
 * v3 = EP-3.02（Cat State に currentZone 追加）。
 */
export const CURRENT_SCHEMA_VERSION = 3;

/**
 * 保存する元データ（Persisted / B4 §9.2）。
 * ⚠️ このオブジェクトに派生値・表示文字列・Content 参照実体を入れてはならない。
 */
export interface GameSnapshot {
  /** 再現性（G-3）: シードと RNG ストリーム位置。 */
  readonly determinism: {
    readonly seed: number;
    /**
     * ルートストリームの消費位置（B4 §9.3 streamPositions）。
     * ⚠️ Sprint 1 骨格ではルート1系列のみ。用途別ストリーム位置の個別保存は OI-2 で正式化。
     */
    readonly streamState: number;
  };
  /** 進行（B4 §9.3 progress）。 */
  readonly progress: {
    readonly day: number;
    readonly segment: number;
    readonly phase: TrialPhase;
  };
  /** アプリ全体フェーズ（B4 §8 Persisted「現在のゲームフェーズ」）。 */
  readonly gamePhase: GamePhase;
  /** 猫の真実（B4 §9.2 Persisted「Cat State（全項目）」）。 */
  readonly simulation: {
    readonly cat: CatState;
  };
  /**
   * 観察履歴（B4 §9.2 Persisted「観測履歴」）。Player Knowledge の再生成元。
   * ⚠️ 任意（後方互換）: 旧セーブには無いため absent を許容し、復元時は [] で補完する（B4 §9.6 フィールド追加）。
   */
  readonly observationLog?: readonly ObservationEntry[];
  /**
   * 未発見の痕跡（B4 §9.2 Persisted「Trace」/ EP-2.06）。不在 Segment で累積し在室で発見される。
   * ⚠️ 任意（後方互換）: 旧セーブには無いため absent を許容し、復元時は [] で補完する（B4 §9.6）。
   */
  readonly traces?: readonly Trace[];
  /**
   * 発火済みイベントID（B4 §9.2 Persisted「Event State」/ EP-2.09）。一度だけ発火の判定に使う。
   * ⚠️ 任意（後方互換）: absent は [] で補完（B4 §9.6）。
   */
  readonly firedEventIds?: readonly string[];
  /**
   * 発火が累積した環境調整（代表 Zone の security/comfort 加算・EP-2.09）。
   * ⚠️ 派生ではなく「発火の結果として世界に加わった変化」の元データ。任意（後方互換）: absent は 0 で補完。
   */
  readonly envAdjust?: { readonly security: number; readonly comfort: number };
}

export interface SaveMeta {
  readonly schemaVersion: number;
  /** 保存時刻（壁時計）。決定論のため SaveSystem が注入した Clock から得る。 */
  readonly savedAt: number;
  /** 整合性検証（B4 §9.5）。payload から算出。 */
  readonly checksum: string;
  /** 診断用（B4 §9.3 buildVersion）。 */
  readonly buildVersion: string;
}

export interface SaveData {
  readonly meta: SaveMeta;
  readonly data: GameSnapshot;
}

// --- 決定論的シリアライズ（checksum の安定化） ---

/**
 * キーを再帰的にソートして安定した文字列を得る。
 * JSON.stringify はキー挿入順に依存するため、checksum の再現性を保証する目的で使う。
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`);
  return `{${entries.join(',')}}`;
}

/**
 * FNV-1a 32bit ハッシュ（決定論的・Math.random/Date 不使用）。
 * 暗号強度は不要。目的は「破損・改竄の検出」（B4 §9.5 / AA-76）。
 */
export function computeChecksum(snapshot: GameSnapshot): string {
  const text = stableStringify(snapshot);
  let hash = 0x811c_9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x0100_0193) >>> 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Snapshot を保存構造へ包む（純粋）。savedAt は呼び出し側が注入する。 */
export function serialize(snapshot: GameSnapshot, savedAt: number, buildVersion: string): SaveData {
  return {
    meta: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      savedAt,
      checksum: computeChecksum(snapshot),
      buildVersion,
    },
    data: snapshot,
  };
}

// --- 整合性検証（B4 §9.5） ---

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const VALID_PHASES = new Set([
  'booting',
  'loading',
  'title',
  'preparing',
  'playing',
  'paused',
  'deciding',
  'ending',
  'epilogue',
  'reflection',
  'error',
]);

/**
 * 構造・値域の検証（B4 §9.5 検証項目）。チェックサムは verifyChecksum が別途担う。
 * ⚠️ 未知の入力（JSON.parse 直後の unknown）を受け取る前提で、握りつぶさず問題を列挙する。
 */
export function validateStructure(value: unknown): ValidationResult {
  const errors: string[] = [];
  const push = (m: string) => errors.push(m);

  if (typeof value !== 'object' || value === null) {
    return { valid: false, errors: ['save data is not an object'] };
  }
  const root = value as Record<string, unknown>;

  const meta = root.meta as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== 'object') {
    push('meta is missing');
  } else {
    if (typeof meta.schemaVersion !== 'number') push('meta.schemaVersion is not a number');
    if (typeof meta.checksum !== 'string') push('meta.checksum is not a string');
  }

  const data = root.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== 'object') {
    push('data is missing');
    return { valid: errors.length === 0, errors };
  }

  const determinism = data.determinism as Record<string, unknown> | undefined;
  if (
    !determinism ||
    typeof determinism.seed !== 'number' ||
    typeof determinism.streamState !== 'number'
  ) {
    push('data.determinism is invalid');
  }

  const progress = data.progress as Record<string, unknown> | undefined;
  if (!progress) {
    push('data.progress is missing');
  } else {
    // Day が 0〜30 の範囲か（B4 §9.5・Day 0 は到着の扱い）
    if (typeof progress.day !== 'number' || progress.day < 0 || progress.day > 30) {
      push(`data.progress.day out of range: ${String(progress.day)}`);
    }
    if (typeof progress.segment !== 'number' || progress.segment < 0) {
      push(`data.progress.segment invalid: ${String(progress.segment)}`);
    }
    if (progress.phase !== 'running' && progress.phase !== 'ended') {
      push(`data.progress.phase invalid: ${String(progress.phase)}`);
    }
  }

  if (typeof data.gamePhase !== 'string' || !VALID_PHASES.has(data.gamePhase)) {
    push(`data.gamePhase invalid: ${String(data.gamePhase)}`);
  }

  // Cat State は全形を検証する（B4 §9.5 参照整合性）。
  // ⚠️ cat の形（needs/affect/relationship/behavior）を変えたら、ここと schema 版/マイグレーションを更新する。
  //    検証が緩いと、互換性のない旧セーブが「通って」しまい、復元後に実行時クラッシュする（EP-2.02 の教訓）。
  const simulation = data.simulation as Record<string, unknown> | undefined;
  const cat = simulation?.cat as Record<string, unknown> | undefined;
  const nums = (o: unknown, keys: readonly string[]): boolean =>
    typeof o === 'object' &&
    o !== null &&
    keys.every((k) => typeof (o as Record<string, unknown>)[k] === 'number');
  if (!cat || typeof cat.arrived !== 'boolean') {
    push('data.simulation.cat is invalid');
  } else {
    if (!nums(cat.needs, ['safety', 'hunger', 'elimination']))
      push('data.simulation.cat.needs is invalid');
    if (!nums(cat.affect, ['arousal', 'valence', 'vigilance', 'stressLoad']))
      push('data.simulation.cat.affect is invalid');
    if (!nums(cat.relationship, ['trust', 'familiarity']))
      push('data.simulation.cat.relationship is invalid');
    if (typeof cat.behavior !== 'string') push('data.simulation.cat.behavior is invalid');
    if (typeof cat.currentZone !== 'string') push('data.simulation.cat.currentZone is invalid');
  }

  // 観察履歴・痕跡は任意（旧セーブ後方互換・B4 §9.6）。存在するなら配列であること。
  if (data.observationLog !== undefined && !Array.isArray(data.observationLog)) {
    push('data.observationLog is invalid');
  }
  if (data.traces !== undefined && !Array.isArray(data.traces)) {
    push('data.traces is invalid');
  }
  // 発火状態（EP-2.09）も任意（後方互換）。firedEventIds は配列、envAdjust は数値2項。
  if (data.firedEventIds !== undefined && !Array.isArray(data.firedEventIds)) {
    push('data.firedEventIds is invalid');
  }
  if (data.envAdjust !== undefined && !nums(data.envAdjust, ['security', 'comfort'])) {
    push('data.envAdjust is invalid');
  }

  return { valid: errors.length === 0, errors };
}

/** 保存構造のチェックサムを検証する（B4 §9.5）。 */
export function verifyChecksum(save: SaveData): boolean {
  return computeChecksum(save.data) === save.meta.checksum;
}

// --- マイグレーション（B4 §9.6） ---

/** 与えられたオブジェクトが指定キーをすべて number として持つか（マイグレーションの保全判定）。 */
function hasNums(o: unknown, keys: readonly string[]): boolean {
  return (
    typeof o === 'object' &&
    o !== null &&
    keys.every((k) => typeof (o as Record<string, unknown>)[k] === 'number')
  );
}

/**
 * 旧スキーマ版 → 次版への変換関数。キーは「変換元の版」。
 * ⚠️ マイグレーションは一方向のみ（B4 §9.6）。ダウングレードは提供しない。
 * ⚠️ スキーマを +1 するたびに「その一つ前の版 → 新版」への関数を必ず追加する（AA-77 の防止）。
 */
export const MIGRATIONS: Readonly<
  Record<number, (raw: Record<string, unknown>) => Record<string, unknown>>
> = {
  /**
   * v1 → v2: Cat State を全形へ、観察履歴・痕跡フィールドを補完する（B4 §9.6）。
   * ⚠️ 既に妥当な値（Sprint2 で v1 として書かれた実データ）は**保全**する（既定値で上書きしない＝データ喪失防止）。
   *    欠落・不正な部分だけ初期値で補う。
   */
  1: (raw) => {
    const data = (raw.data ?? {}) as Record<string, unknown>;
    const sim = (data.simulation ?? {}) as Record<string, unknown>;
    const oldCat = (sim.cat ?? {}) as Record<string, unknown>;
    const base = initialCatState();
    // v2 形（currentZone は v3 の MIGRATIONS[2] で補完するため、ここでは付けない）。
    const cat = {
      arrived: typeof oldCat.arrived === 'boolean' ? oldCat.arrived : base.arrived,
      needs: hasNums(oldCat.needs, ['safety', 'hunger', 'elimination'])
        ? (oldCat.needs as CatState['needs'])
        : base.needs,
      affect: hasNums(oldCat.affect, ['arousal', 'valence', 'vigilance', 'stressLoad'])
        ? (oldCat.affect as CatState['affect'])
        : base.affect,
      relationship: hasNums(oldCat.relationship, ['trust', 'familiarity'])
        ? (oldCat.relationship as CatState['relationship'])
        : base.relationship,
      behavior:
        typeof oldCat.behavior === 'string'
          ? (oldCat.behavior as CatState['behavior'])
          : base.behavior,
    };
    const meta = (raw.meta ?? {}) as Record<string, unknown>;
    return {
      ...raw,
      meta: { ...meta, schemaVersion: 2 },
      data: {
        ...data,
        simulation: { cat },
        observationLog: Array.isArray(data.observationLog) ? data.observationLog : [],
        traces: Array.isArray(data.traces) ? data.traces : [],
      },
    };
  },
  /**
   * v2 → v3: Cat State に currentZone を補完する（EP-3.02・B4 §9.6）。
   * 既に妥当な文字列があれば保全し、無ければ既定 Zone（refuge）で補う。
   */
  2: (raw) => {
    const data = (raw.data ?? {}) as Record<string, unknown>;
    const sim = (data.simulation ?? {}) as Record<string, unknown>;
    const oldCat = (sim.cat ?? {}) as Record<string, unknown>;
    const currentZone =
      typeof oldCat.currentZone === 'string' && oldCat.currentZone.length > 0
        ? oldCat.currentZone
        : initialCatState().currentZone;
    const meta = (raw.meta ?? {}) as Record<string, unknown>;
    return {
      ...raw,
      meta: { ...meta, schemaVersion: 3 },
      data: { ...data, simulation: { cat: { ...oldCat, currentZone } } },
    };
  },
};

export type MigrationResult =
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false; readonly reason: string };

/**
 * fromVersion から CURRENT_SCHEMA_VERSION まで順に変換する（B4 §9.5/§9.6）。
 * - 新しすぎる版（未来のデータ）は復元不可
 * - 変換関数が無い版は復元不可（無言のデータ破壊を避ける）
 */
export function migrate(raw: Record<string, unknown>, fromVersion: number): MigrationResult {
  if (fromVersion > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: `schema version ${fromVersion} is newer than supported ${CURRENT_SCHEMA_VERSION}`,
    };
  }
  let current = raw;
  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) {
      return { ok: false, reason: `no migration from schema version ${v}` };
    }
    current = step(current);
  }
  return { ok: true, value: current };
}

/**
 * Content Definition — 定義データの基底と検証の仕組み（L0 Data / B4 D-01）
 *
 * L0 は葉ノード（B4 DR-8）。他層を一切 import しない純粋データ層。
 * 定義そのものは「データのみ・ロジックを持たない」（D-01 禁止事項）。
 * ここが持つのは定義を安全に受け入れるための検証機構だけである。
 *
 * ⚠️ ID 命名規則・JSON の具体形式は B11 Data Architecture Bible（未作成 / OI-2）の管轄。
 *    本モジュールは「規則が確定したら schema に載せる」ための骨格に留める。
 *    現時点の唯一の普遍的制約は「id が非空文字列であること」。
 */

/** すべての定義の基底。id で一意に引ける（規則詳細は OI-2）。 */
export interface ContentDefinition {
  readonly id: string;
}

export type Validated<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

/**
 * 種別ごとの検証器。raw（JSON.parse 直後の unknown）を検証し、
 * 通れば凍結済みの型付き定義を、通らなければ理由を返す。
 */
export interface ContentSchema<T extends ContentDefinition> {
  readonly kind: string;
  validate(raw: unknown): Validated<T>;
}

/** 検証中に投げる内部例外。defineSchema が捕捉して Validated に変換する。 */
export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaError';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** フィールド検証ヘルパ。違反時は SchemaError を投げる（defineSchema が集約）。 */
export const field = {
  string(rec: Record<string, unknown>, key: string): string {
    const v = rec[key];
    if (typeof v !== 'string') throw new SchemaError(`"${key}" must be a string`);
    return v;
  },
  nonEmptyString(rec: Record<string, unknown>, key: string): string {
    const v = field.string(rec, key);
    if (v.length === 0) throw new SchemaError(`"${key}" must not be empty`);
    return v;
  },
  number(rec: Record<string, unknown>, key: string): number {
    const v = rec[key];
    if (typeof v !== 'number' || Number.isNaN(v))
      throw new SchemaError(`"${key}" must be a number`);
    return v;
  },
  boolean(rec: Record<string, unknown>, key: string): boolean {
    const v = rec[key];
    if (typeof v !== 'boolean') throw new SchemaError(`"${key}" must be a boolean`);
    return v;
  },
  optionalString(rec: Record<string, unknown>, key: string): string | undefined {
    return rec[key] === undefined ? undefined : field.string(rec, key);
  },
} as const;

/** 定義を再帰的に凍結する（実行時の書き換えを構造的に禁じる・D-01）。 */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

/**
 * 検証器を宣言する。parse は「正常なら定義を返す／不正なら SchemaError を投げる」だけを書けばよい。
 * 成功値は deepFreeze され、以後書き換え不能になる。
 */
export function defineSchema<T extends ContentDefinition>(
  kind: string,
  parse: (raw: Record<string, unknown>) => T,
): ContentSchema<T> {
  return {
    kind,
    validate(raw: unknown): Validated<T> {
      if (!isRecord(raw)) return { ok: false, message: `${kind}: definition is not an object` };
      try {
        const value = parse(raw);
        if (typeof value.id !== 'string' || value.id.length === 0) {
          return { ok: false, message: `${kind}: id must be a non-empty string` };
        }
        return { ok: true, value: deepFreeze(value) };
      } catch (e) {
        const detail = e instanceof Error ? e.message : 'invalid';
        return { ok: false, message: `${kind}: ${detail}` };
      }
    },
  };
}

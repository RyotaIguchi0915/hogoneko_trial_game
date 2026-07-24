import type { ContentDefinition, ContentSchema } from './ContentDefinition';

/**
 * Content Definition Registry — 定義データの読込・検証・提供（L0 Data / B4 D-01）
 *
 * 原則（D-01 禁止事項）:
 *   - 実行時に定義を書き換えない（不変）… build 後は読み取り専用、値は deepFreeze 済み
 *   - 検証を通らない定義を提供しない … 不正定義は登録されず、strict 起動では中止（E-2）
 *
 * ⚠️ 拡張は「定義追加のみ」で成立させる（B0 §14.2 / ⑩）。新種別は schema を足すだけ。
 * ⚠️ ID 命名規則・参照解決の詳細は OI-2（B11）で正式化する。
 */

export interface DefinitionError {
  readonly kind: string;
  /** 取得できた場合の id（不正で取れない場合は null）。 */
  readonly id: string | null;
  /** そのバッチ内での位置（診断用）。 */
  readonly index: number;
  readonly message: string;
}

export interface LoadReport {
  readonly loaded: number;
  readonly errors: readonly DefinitionError[];
}

/** 検証を通らない定義があった場合に strict build が投げる例外（起動中止・E-2）。 */
export class ContentValidationError extends Error {
  readonly errors: readonly DefinitionError[];
  constructor(errors: readonly DefinitionError[]) {
    super(
      `content validation failed for ${errors.length} definition(s):\n` +
        errors.map((e) => ` - [${e.kind}#${e.index}] ${e.message}`).join('\n'),
    );
    this.name = 'ContentValidationError';
    this.errors = errors;
  }
}

/** 読込済み定義の不変な提供口。build でのみ生成され、変更 API を持たない。 */
export class ContentRegistry {
  readonly #byKind: ReadonlyMap<string, ReadonlyMap<string, ContentDefinition>>;

  constructor(byKind: ReadonlyMap<string, ReadonlyMap<string, ContentDefinition>>) {
    this.#byKind = byKind;
  }

  has(kind: string, id: string): boolean {
    return this.#byKind.get(kind)?.has(id) ?? false;
  }

  /** 定義を引く。無ければ undefined（欠損を許容する呼び出し向け・E-1）。 */
  get<T extends ContentDefinition>(kind: string, id: string): T | undefined {
    return this.#byKind.get(kind)?.get(id) as T | undefined;
  }

  /** 定義を必須で引く。無ければ throw（参照整合性を要求する呼び出し向け）。 */
  require<T extends ContentDefinition>(kind: string, id: string): T {
    const def = this.get<T>(kind, id);
    if (def === undefined) {
      throw new Error(`ContentRegistry: missing definition "${kind}/${id}"`);
    }
    return def;
  }

  getAll<T extends ContentDefinition>(kind: string): readonly T[] {
    const map = this.#byKind.get(kind);
    return map ? (Array.from(map.values()) as T[]) : [];
  }

  kinds(): readonly string[] {
    return Array.from(this.#byKind.keys());
  }
}

interface Batch {
  readonly schema: ContentSchema<ContentDefinition>;
  readonly raw: readonly unknown[];
}

/**
 * 定義を集めて検証済みレジストリを構築するビルダー。
 * 起動時に一度だけ使い、build() の戻り値（不変レジストリ）を以後共有する。
 */
export class ContentRegistryBuilder {
  readonly #batches: Batch[] = [];

  add<T extends ContentDefinition>(schema: ContentSchema<T>, raw: readonly unknown[]): this {
    this.#batches.push({ schema: schema as ContentSchema<ContentDefinition>, raw });
    return this;
  }

  /**
   * 全定義を検証して不変レジストリを作る。
   * @param options.strict true なら1件でも不正があれば例外（起動中止・E-2）。
   *   false（既定）なら不正を除外して継続し、report.errors に残す（E-1 的な縮退）。
   */
  build(options: { readonly strict?: boolean } = {}): {
    readonly registry: ContentRegistry;
    readonly report: LoadReport;
  } {
    const byKind = new Map<string, Map<string, ContentDefinition>>();
    const errors: DefinitionError[] = [];
    let loaded = 0;

    for (const { schema, raw } of this.#batches) {
      const kindMap = byKind.get(schema.kind) ?? new Map<string, ContentDefinition>();
      byKind.set(schema.kind, kindMap);

      raw.forEach((entry, index) => {
        const result = schema.validate(entry);
        if (!result.ok) {
          errors.push({ kind: schema.kind, id: null, index, message: result.message });
          return;
        }
        const def = result.value;
        if (kindMap.has(def.id)) {
          errors.push({
            kind: schema.kind,
            id: def.id,
            index,
            message: `duplicate id "${def.id}"`,
          });
          return; // 先勝ち。重複は提供しない。
        }
        kindMap.set(def.id, def);
        loaded++;
      });
    }

    if (options.strict && errors.length > 0) {
      throw new ContentValidationError(errors);
    }

    return { registry: new ContentRegistry(byKind), report: { loaded, errors } };
  }
}

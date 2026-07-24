import { describe, it, expect } from 'vitest';
import { defineSchema, field, type ContentDefinition } from './ContentDefinition';
import { ContentRegistryBuilder, ContentValidationError } from './ContentRegistry';

// サンプル種別（家具を模した最小定義）。実スキーマ・ID 規則は OI-2 で確定。
interface FurnitureDef extends ContentDefinition {
  readonly label: string;
  readonly footprint: number;
}

const furnitureSchema = defineSchema<FurnitureDef>('furniture', (raw) => ({
  id: field.nonEmptyString(raw, 'id'),
  label: field.nonEmptyString(raw, 'label'),
  footprint: field.number(raw, 'footprint'),
}));

describe('ContentRegistry — 検証付き読込（D-01）', () => {
  it('正しい定義を読み込み、id で引ける', () => {
    const { registry, report } = new ContentRegistryBuilder()
      .add(furnitureSchema, [
        { id: 'bed', label: '猫ベッド', footprint: 2 },
        { id: 'tower', label: 'キャットタワー', footprint: 3 },
      ])
      .build();

    expect(report).toEqual({ loaded: 2, errors: [] });
    expect(registry.get<FurnitureDef>('furniture', 'bed')?.label).toBe('猫ベッド');
    expect(registry.getAll<FurnitureDef>('furniture')).toHaveLength(2);
    expect(registry.has('furniture', 'tower')).toBe(true);
    expect(registry.kinds()).toEqual(['furniture']);
  });

  it('検証を通らない定義は提供しない（不正を拒否）', () => {
    const { registry, report } = new ContentRegistryBuilder()
      .add(furnitureSchema, [
        { id: 'ok', label: 'よい', footprint: 1 },
        { id: 'bad', label: '', footprint: 1 }, // label 空 → 不正
        { id: '', label: 'noid', footprint: 1 }, // id 空 → 不正
        { label: '数値欠落', footprint: 'x' }, // footprint 型不正
        'not-an-object',
      ])
      .build();

    expect(report.loaded).toBe(1);
    expect(report.errors).toHaveLength(4);
    expect(registry.has('furniture', 'bad')).toBe(false);
    expect(registry.get('furniture', 'ok')).toBeDefined();
  });

  it('重複 id は先勝ちで、重複を errors に残す', () => {
    const { registry, report } = new ContentRegistryBuilder()
      .add(furnitureSchema, [
        { id: 'dup', label: '一番目', footprint: 1 },
        { id: 'dup', label: '二番目', footprint: 2 },
      ])
      .build();

    expect(registry.get<FurnitureDef>('furniture', 'dup')?.label).toBe('一番目');
    expect(report.errors.some((e) => /duplicate id/.test(e.message))).toBe(true);
  });

  it('strict 起動では不正が1件でもあれば中止する（E-2）', () => {
    const build = () =>
      new ContentRegistryBuilder()
        .add(furnitureSchema, [{ id: 'ok', label: 'よい', footprint: 1 }, { id: 'x' }])
        .build({ strict: true });

    expect(build).toThrow(ContentValidationError);
  });

  it('require は欠損時に throw する（参照整合性）', () => {
    const { registry } = new ContentRegistryBuilder().add(furnitureSchema, []).build();
    expect(() => registry.require('furniture', 'nope')).toThrow(/missing definition/);
  });
});

describe('ContentRegistry — 不変性（D-01: 実行時に書き換えない）', () => {
  it('提供された定義は凍結されている', () => {
    const { registry } = new ContentRegistryBuilder()
      .add(furnitureSchema, [{ id: 'bed', label: '猫ベッド', footprint: 2 }])
      .build();
    const def = registry.get<FurnitureDef>('furniture', 'bed')!;
    expect(Object.isFrozen(def)).toBe(true);
    expect(() => {
      // @ts-expect-error 読み取り専用への書き込みを試みる
      def.label = '改竄';
    }).toThrow();
  });
});

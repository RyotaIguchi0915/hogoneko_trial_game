import {
  defineSchema,
  field,
  isRecord,
  SchemaError,
  type ContentDefinition,
  type ContentSchema,
} from '../registry/ContentDefinition';

/**
 * Environment 定義スキーマ（L0 Data / B10 §9 / B11）
 *
 * ⚠️ FurnitureDefinition に「効果値」フィールドを置かない（AA-65）。contributions は
 *    物理的属性への寄与（{attribute, delta}）のみ。ZoneSecurity/Comfort は保存せず導出する（AA-31）。
 * ⚠️ 表示テキストは持たず、labelKey（ローカライズキー・B11 §4）で参照する。
 */

/** Zone の基礎属性（B10 §3.2・10種のうち MVP で使う分）。selfScent は Zone 側に別持ち。 */
export interface ZoneAttributes {
  readonly height: number;
  readonly cover: number;
  readonly exits: number;
  readonly sightline: number;
  readonly humanDistance: number;
  readonly trafficLevel: number;
  readonly noiseLevel: number;
  readonly lightLevel: number;
  readonly temperature: number;
  /** 家具由来の柔らかさ（ZoneComfort に効く・B10 §3.3）。 */
  readonly softness: number;
}

/** 基礎属性の名前（家具の寄与先）。 */
export type AttributeName = keyof ZoneAttributes;

const ATTRIBUTE_NAMES: readonly AttributeName[] = [
  'height',
  'cover',
  'exits',
  'sightline',
  'humanDistance',
  'trafficLevel',
  'noiseLevel',
  'lightLevel',
  'temperature',
  'softness',
];

export interface AttributeContribution {
  readonly attribute: AttributeName;
  readonly delta: number;
}

export type FurnitureCategory = 'structural' | 'resource' | 'comfort' | 'stimulus' | 'tool';

export interface FurnitureDef extends ContentDefinition {
  readonly category: FurnitureCategory;
  /** 表示名のローカライズキー（B11 §4）。 */
  readonly labelKey: string;
  /** 物理的寄与のみ（効果値ではない・AA-65）。 */
  readonly contributions: readonly AttributeContribution[];
}

export type ZoneType = 'refuge' | 'rest' | 'vantage' | 'resource' | 'open' | 'boundary';

export interface ZoneDef {
  readonly id: string;
  readonly type: ZoneType;
  readonly base: ZoneAttributes;
  /** 自己臭の初期値（可変・B10）。 */
  readonly selfScent: number;
  /** この Zone に設置された家具の id（FurnitureDef を参照）。 */
  readonly furniture: readonly string[];
}

export interface RoomDef extends ContentDefinition {
  /** 猫の既定の居場所（環境入力の代表 Zone）。⚠️ Cat AI 実装（EP-2.02）までの暫定。 */
  readonly defaultZoneId: string;
  readonly zones: readonly ZoneDef[];
}

const FURNITURE_CATEGORIES = new Set<string>([
  'structural',
  'resource',
  'comfort',
  'stimulus',
  'tool',
]);
const ZONE_TYPES = new Set<string>(['refuge', 'rest', 'vantage', 'resource', 'open', 'boundary']);

function parseAttributes(raw: unknown): ZoneAttributes {
  if (!isRecord(raw)) throw new SchemaError('zone.base must be an object');
  const attrs = {} as Record<AttributeName, number>;
  for (const name of ATTRIBUTE_NAMES) {
    attrs[name] = field.number(raw, name);
  }
  return attrs;
}

/** 家具スキーマ。contributions は既知属性への数値寄与のみ。 */
export const furnitureSchema: ContentSchema<FurnitureDef> = defineSchema<FurnitureDef>(
  'furniture',
  (raw) => {
    const category = field.string(raw, 'category');
    if (!FURNITURE_CATEGORIES.has(category)) {
      throw new SchemaError(`unknown furniture category "${category}"`);
    }
    const rawContribs = raw.contributions;
    if (!Array.isArray(rawContribs)) throw new SchemaError('contributions must be an array');
    const contributions = rawContribs.map((c): AttributeContribution => {
      if (!isRecord(c)) throw new SchemaError('contribution must be an object');
      const attribute = field.string(c, 'attribute');
      if (!ATTRIBUTE_NAMES.includes(attribute as AttributeName)) {
        throw new SchemaError(`unknown contribution attribute "${attribute}"`);
      }
      return { attribute: attribute as AttributeName, delta: field.number(c, 'delta') };
    });
    return {
      id: field.nonEmptyString(raw, 'id'),
      category: category as FurnitureCategory,
      labelKey: field.nonEmptyString(raw, 'labelKey'),
      contributions,
    };
  },
);

/** 部屋スキーマ。zones と defaultZoneId の参照整合は EnvironmentSystem 構築時に検証する。 */
export const roomSchema: ContentSchema<RoomDef> = defineSchema<RoomDef>('room', (raw) => {
  const rawZones = raw.zones;
  if (!Array.isArray(rawZones) || rawZones.length === 0) {
    throw new SchemaError('room.zones must be a non-empty array');
  }
  const zones = rawZones.map((z): ZoneDef => {
    if (!isRecord(z)) throw new SchemaError('zone must be an object');
    const type = field.string(z, 'type');
    if (!ZONE_TYPES.has(type)) throw new SchemaError(`unknown zone type "${type}"`);
    const furniture = Array.isArray(z.furniture) ? z.furniture : [];
    if (!furniture.every((f): f is string => typeof f === 'string')) {
      throw new SchemaError('zone.furniture must be string ids');
    }
    return {
      id: field.nonEmptyString(z, 'id'),
      type: type as ZoneType,
      base: parseAttributes(z.base),
      selfScent: field.number(z, 'selfScent'),
      furniture,
    };
  });
  return {
    id: field.nonEmptyString(raw, 'id'),
    defaultZoneId: field.nonEmptyString(raw, 'defaultZoneId'),
    zones,
  };
});

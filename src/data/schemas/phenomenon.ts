import {
  defineSchema,
  field,
  SchemaError,
  type ContentDefinition,
  type ContentSchema,
} from '../registry/ContentDefinition';

/**
 * Phenomenon 語彙スキーマ（L0 Data / B4 P-02 / B11 §6）
 *
 * 現象語彙は「観測可能な事実」の共通言語。⚠️ 語彙に「意味」「正解」「数値属性」を持たせない（B4 P-02）。
 * 表示テキストは持たず labelKey（ローカライズキー）で参照する（B11 §4）。
 */

export type PhenomenonChannel = 'direct' | 'indirect' | 'sound';

export interface PhenomenonDef extends ContentDefinition {
  readonly channel: PhenomenonChannel;
  /** 表示（観測可能な事実の言語化）のローカライズキー。 */
  readonly labelKey: string;
}

const CHANNELS = new Set<string>(['direct', 'indirect', 'sound']);

export const phenomenonSchema: ContentSchema<PhenomenonDef> = defineSchema<PhenomenonDef>(
  'phenomenon',
  (raw) => {
    const channel = field.string(raw, 'channel');
    if (!CHANNELS.has(channel)) throw new SchemaError(`unknown phenomenon channel "${channel}"`);
    return {
      id: field.nonEmptyString(raw, 'id'),
      channel: channel as PhenomenonChannel,
      labelKey: field.nonEmptyString(raw, 'labelKey'),
    };
  },
);

/** 修飾語彙（qualifier）。descriptor と同様、意味・数値を持たない。 */
export interface QualifierDef extends ContentDefinition {
  readonly labelKey: string;
}

export const qualifierSchema: ContentSchema<QualifierDef> = defineSchema<QualifierDef>(
  'qualifier',
  (raw) => ({
    id: field.nonEmptyString(raw, 'id'),
    labelKey: field.nonEmptyString(raw, 'labelKey'),
  }),
);

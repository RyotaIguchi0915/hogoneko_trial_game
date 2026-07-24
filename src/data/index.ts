// L0 Data — 公開 API の集約（葉ノード / B4 DR-8）
// ⚠️ この層は他層を import しない。参照されるだけの純粋データ層。

export {
  type ContentDefinition,
  type ContentSchema,
  type Validated,
  SchemaError,
  isRecord,
  field,
  deepFreeze,
  defineSchema,
} from './registry/ContentDefinition';

export {
  ContentRegistry,
  ContentRegistryBuilder,
  ContentValidationError,
  type DefinitionError,
  type LoadReport,
} from './registry/ContentRegistry';

export {
  Localization,
  type LocaleParams,
  type LocalizationDictionary,
} from './localization/Localization';

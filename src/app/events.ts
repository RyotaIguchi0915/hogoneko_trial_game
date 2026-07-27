import { ContentRegistryBuilder } from '@data/index';
import { phenomenonSchema } from '@data/schemas/phenomenon';
import {
  eventSchema,
  learningLineSchema,
  crossValidateEvents,
  type EventDef,
} from '@data/schemas/event';
import { PHENOMENON_CONTENT } from '@content/phenomena';
import { EVENT_CONTENT, LEARNING_LINE_CONTENT } from '@content/events';

/**
 * イベント content の組み立て（合成ルート src/app / EP-2.09 発火 runtime）
 *
 * イベント/学習ライン/現象語彙を ContentRegistry で検証（B8 §11.4）し、参照整合（Cue→Phenomenon・
 * 役割 T-1/T-3/T-4/T-5 網羅）を crossValidate してから、検証済み EventDef を返す。
 * ⚠️ 検証を通らない定義があれば strict で起動を中止する（E-2）。content 読込は合成ルートの責務。
 */
export function buildEventContent(): readonly EventDef[] {
  const { registry } = new ContentRegistryBuilder()
    .add(phenomenonSchema, PHENOMENON_CONTENT)
    .add(eventSchema, EVENT_CONTENT)
    .add(learningLineSchema, LEARNING_LINE_CONTENT)
    .build({ strict: true });

  const errors = crossValidateEvents(registry);
  if (errors.length > 0) {
    throw new Error(`event content failed cross-validation: ${errors.join('; ')}`);
  }
  return registry.getAll<EventDef>('event');
}

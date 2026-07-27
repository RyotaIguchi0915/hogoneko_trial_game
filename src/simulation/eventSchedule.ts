import type { EventDef } from '@data/schemas/event';

/**
 * Event Scheduler — トリガーから「今 発火すべきイベント」を決める（L2 Simulation / B8 §4 / EP-2.09 発火 runtime）
 *
 * 純粋・決定論。トリガーはデータ駆動でコードにハードコードしない（B8 §4 / AA-59）。
 * ⚠️ MVP は time トリガー（day 単位）のみ。確率（TR-6）/状態（TR-2）/複合（TR-7）は監修で拡充する
 *    （確率は「いつ/どの変種か」に限り、発生可否には使わない・B8 §4.2。RNG stream 'event' を後日追加）。
 * ⚠️ 再発火（repeatable/maxOccurrence）は未対応（既発火は firedIds で一度だけ）。
 */
export function dueEvents(
  events: readonly EventDef[],
  day: number,
  firedIds: ReadonlySet<string>,
): readonly EventDef[] {
  return events.filter((e) => {
    if (firedIds.has(e.id)) return false; // 既に発火済み（MVP は一度だけ）
    if (e.trigger.type !== 'time') return false; // MVP は time トリガーのみ
    const triggerDay = e.trigger.params?.day;
    // その Day に達したら一度発火する（day を跨いで到達しても取りこぼさない）。
    return typeof triggerDay === 'number' && day >= triggerDay;
  });
}

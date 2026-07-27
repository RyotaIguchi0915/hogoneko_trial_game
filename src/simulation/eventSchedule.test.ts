import { describe, it, expect } from 'vitest';
import { dueEvents } from './eventSchedule';
import type { EventDef, TriggerType } from '@data/schemas/event';

function ev(id: string, day: number, triggerType: TriggerType = 'time'): EventDef {
  return {
    id,
    internalName: id,
    learningLine: 'line.x',
    role: 'seeding',
    difficulty: 1,
    trigger: { type: triggerType, params: { day } },
    changes: [],
    cues: [],
    termination: { type: 'duration' },
  };
}

describe('Event Scheduler dueEvents（B8 §4 / EP-2.09）', () => {
  const events = [ev('a', 2), ev('b', 3)];

  it('トリガー Day 未満では発火対象にならない', () => {
    expect(dueEvents(events, 1, new Set()).map((e) => e.id)).toEqual([]);
  });

  it('トリガー Day に達すると発火対象になる', () => {
    expect(dueEvents(events, 2, new Set()).map((e) => e.id)).toEqual(['a']);
  });

  it('Day を跨いで到達しても取りこぼさない（day>=triggerDay）', () => {
    // 未発火なら a(2)・b(3) とも対象（実際は a は先に発火して firedIds に入る）。
    expect(dueEvents(events, 3, new Set()).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('既発火は対象から除く（一度だけ）', () => {
    expect(dueEvents(events, 3, new Set(['a'])).map((e) => e.id)).toEqual(['b']);
  });

  it('time 以外のトリガーは MVP では発火しない（監修で拡充）', () => {
    expect(dueEvents([ev('s', 1, 'state')], 5, new Set())).toEqual([]);
    expect(dueEvents([ev('p', 1, 'probability')], 5, new Set())).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { createEventBus } from '../events/EventBus';
import { TimeSystem, TimeEvents } from './TimeSystem';
import type { TimeState } from './TimeState';

describe('TimeSystem — Imperative Shell', () => {
  it('advanceSegment で segmentAdvanced を発行する', () => {
    const bus = createEventBus();
    const time = new TimeSystem(bus);
    const segments: TimeState[] = [];
    bus.on(TimeEvents.segmentAdvanced, (s) => segments.push(s));

    time.advanceSegment();
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ day: 1, segment: 1, phase: 'running' });
    expect(time.now()).toEqual({ day: 1, segment: 1, phase: 'running' });
  });

  it('日をまたぐと dayAdvanced も発行する', () => {
    const bus = createEventBus();
    const time = new TimeSystem(bus);
    let dayEvents = 0;
    bus.on(TimeEvents.dayAdvanced, () => dayEvents++);

    for (let i = 0; i < 6; i++) time.advanceSegment(); // Day1 → Day2
    expect(dayEvents).toBe(1);
    expect(time.now().day).toBe(2);
  });

  it('トライアル終端で trialEnded を発行する', () => {
    const bus = createEventBus();
    const time = new TimeSystem(bus, { totalDays: 1, segmentsPerDay: 2 });
    let ended = 0;
    bus.on(TimeEvents.trialEnded, () => ended++);

    time.advanceSegment(); // Day1 Seg1
    time.advanceSegment(); // 越える → ended
    expect(ended).toBe(1);
    expect(time.now().phase).toBe('ended');
  });

  it('巻き戻し API を公開していない（Pillar 4）', () => {
    const bus = createEventBus();
    const time = new TimeSystem(bus);
    // 型・API に rewind/back/setDay 等が存在しないことを表明
    expect('rewind' in time).toBe(false);
    expect('setDay' in time).toBe(false);
  });
});

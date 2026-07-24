import { describe, it, expect } from 'vitest';
import {
  advanceSegment,
  initialTime,
  isInRoomSegment,
  type TrialConfig,
  type TimeState,
} from './TimeState';

const CONFIG: TrialConfig = { totalDays: 30, segmentsPerDay: 6 };

/** 指定回数 Segment を進めた最終状態を返す（ヘルパ） */
function advanceN(start: TimeState, n: number, config: TrialConfig): TimeState {
  let state = start;
  for (let i = 0; i < n; i++) {
    state = advanceSegment(state, config).state;
  }
  return state;
}

describe('Time — Functional Core', () => {
  it('初期時刻は Day1 / Segment0 / running', () => {
    expect(initialTime()).toEqual({ day: 1, segment: 0, phase: 'running' });
  });

  it('Segment を進めると segment が増える（日はまたがない）', () => {
    const r = advanceSegment(initialTime(), CONFIG);
    expect(r.state).toEqual({ day: 1, segment: 1, phase: 'running' });
    expect(r.crossedDay).toBe(false);
    expect(r.endedTrial).toBe(false);
  });

  it('最終 Segment を越えると日をまたぐ', () => {
    const lastSegOfDay1: TimeState = { day: 1, segment: 5, phase: 'running' };
    const r = advanceSegment(lastSegOfDay1, CONFIG);
    expect(r.state).toEqual({ day: 2, segment: 0, phase: 'running' });
    expect(r.crossedDay).toBe(true);
  });

  it('1日ちょうど（6 Segment）で Day2 の頭に来る', () => {
    const after6 = advanceN(initialTime(), 6, CONFIG);
    expect(after6).toEqual({ day: 2, segment: 0, phase: 'running' });
  });

  it('最終日の最終 Segment を越えると trial が終了する', () => {
    const lastMoment: TimeState = { day: 30, segment: 5, phase: 'running' };
    const r = advanceSegment(lastMoment, CONFIG);
    expect(r.endedTrial).toBe(true);
    expect(r.state.phase).toBe('ended');
    expect(r.state.day).toBe(30); // 最終日に留まる
  });

  it('ended 以降は no-op（巻き戻らない・過ぎない・Pillar 4）', () => {
    const ended: TimeState = { day: 30, segment: 5, phase: 'ended' };
    const r = advanceSegment(ended, CONFIG);
    expect(r.state).toEqual(ended);
    expect(r.endedTrial).toBe(false);
  });

  it('入力を破壊しない（純粋・不変）', () => {
    const start = initialTime();
    advanceSegment(start, CONFIG);
    expect(start).toEqual({ day: 1, segment: 0, phase: 'running' });
  });

  it('30日 × 6 Segment を通しで進めると最終的に ended になる', () => {
    // Day1 Seg0 から (30*6 - 1) 回進めると Day30 Seg5、もう1回で ended
    const toLastMoment = advanceN(initialTime(), 30 * 6 - 1, CONFIG);
    expect(toLastMoment).toEqual({ day: 30, segment: 5, phase: 'running' });
    const ended = advanceSegment(toLastMoment, CONFIG);
    expect(ended.state.phase).toBe('ended');
  });

  it('isInRoomSegment は在室 Segment を判定する（暫定 B5 §1.2）', () => {
    expect(isInRoomSegment(1)).toBe(true); // 朝
    expect(isInRoomSegment(3)).toBe(true); // 夕
    expect(isInRoomSegment(4)).toBe(true); // 夜
    expect(isInRoomSegment(0)).toBe(false); // 未明
    expect(isInRoomSegment(2)).toBe(false); // 昼
    expect(isInRoomSegment(5)).toBe(false); // 深夜
  });
});

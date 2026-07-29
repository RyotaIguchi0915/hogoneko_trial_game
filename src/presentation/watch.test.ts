import { describe, it, expect } from 'vitest';
import { isWatchable, shouldStopWatching } from './watch';
import type { AppView } from './appView';

/** 最小の AppView（見守り判定に効くフィールドのみ・他は既定）。 */
function view(over: Partial<AppView>): AppView {
  return {
    restoreStatus: 'ok',
    day: 1,
    segment: 0,
    segmentsPerDay: 6,
    phase: 'running',
    gamePhase: 'playing',
    decision: null,
    bondTier: 'warming',
    observations: [],
    catSprite: null,
    catPlace: null,
    actionSlots: 0,
    hypotheses: [],
    placements: [],
    knowledgeNotes: [],
    ...over,
  };
}

describe('見守り判定（EP-3.11）', () => {
  it('本編プレイ中で running なら見守れる', () => {
    expect(isWatchable(view({ gamePhase: 'playing', phase: 'running' }))).toBe(true);
  });

  it('本編（playing）でなければ見守れない', () => {
    expect(isWatchable(view({ gamePhase: 'title' }))).toBe(false);
    expect(isWatchable(view({ gamePhase: 'deciding' }))).toBe(false);
  });

  it('トライアルが終わっていれば見守れない', () => {
    expect(isWatchable(view({ phase: 'ended' }))).toBe(false);
  });

  it('不在（行動枠0）の間は止めない＝自動で流す', () => {
    expect(shouldStopWatching(view({ actionSlots: 0 }))).toBe(false);
  });

  it('在室（世話できる＝行動枠あり）に達したら止める', () => {
    expect(shouldStopWatching(view({ actionSlots: 2 }))).toBe(true);
  });

  it('本編を外れた／終わったら止める（在室でなくても）', () => {
    expect(shouldStopWatching(view({ gamePhase: 'deciding', actionSlots: 0 }))).toBe(true);
    expect(shouldStopWatching(view({ phase: 'ended', actionSlots: 0 }))).toBe(true);
  });
});

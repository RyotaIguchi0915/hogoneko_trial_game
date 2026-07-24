import { describe, it, expect } from 'vitest';
import { canTransitionGamePhase, allowedGamePhaseTransitions } from './gamePhase';

describe('Game Phase 遷移', () => {
  it('正当な遷移を許可する', () => {
    expect(canTransitionGamePhase('booting', 'loading')).toBe(true);
    expect(canTransitionGamePhase('loading', 'title')).toBe(true);
    expect(canTransitionGamePhase('title', 'preparing')).toBe(true);
    expect(canTransitionGamePhase('preparing', 'playing')).toBe(true);
    expect(canTransitionGamePhase('playing', 'deciding')).toBe(true);
    expect(canTransitionGamePhase('deciding', 'ending')).toBe(true);
  });

  it('playing→playing（Day 進行）を許可する', () => {
    expect(canTransitionGamePhase('playing', 'playing')).toBe(true);
  });

  it('不正な遷移を拒否する', () => {
    expect(canTransitionGamePhase('booting', 'playing')).toBe(false);
    expect(canTransitionGamePhase('title', 'ending')).toBe(false);
    expect(canTransitionGamePhase('ending', 'playing')).toBe(false);
  });

  it('一時停止と再開ができる', () => {
    expect(canTransitionGamePhase('playing', 'paused')).toBe(true);
    expect(canTransitionGamePhase('paused', 'playing')).toBe(true);
  });

  it('エラーからの縮退復旧（error→title）を許可する', () => {
    expect(canTransitionGamePhase('error', 'title')).toBe(true);
  });

  it('allowedGamePhaseTransitions が候補を返す', () => {
    expect(allowedGamePhaseTransitions('loading')).toEqual(['title', 'error']);
  });
});

/**
 * Game Phase — アプリ全体フェーズの状態機械（L1 Core / B4 §8.2）
 *
 * 純粋な遷移定義。不正遷移は拒否する（SM-4）。
 */

export type GamePhase =
  | 'booting'
  | 'loading'
  | 'title'
  | 'preparing'
  | 'playing'
  | 'paused'
  | 'deciding'
  | 'ending'
  | 'epilogue'
  | 'reflection'
  | 'error';

/** 許可される遷移（B4 §8.2 の状態図に一致） */
const TRANSITIONS: Readonly<Record<GamePhase, readonly GamePhase[]>> = {
  booting: ['loading'],
  loading: ['title', 'error'],
  title: ['preparing'],
  preparing: ['playing'],
  playing: ['playing', 'paused', 'deciding', 'error'], // playing→playing = Day 進行
  paused: ['playing'],
  deciding: ['ending'],
  ending: ['epilogue'],
  epilogue: ['reflection'],
  reflection: ['title'],
  error: ['title'], // 縮退復旧
};

export function canTransitionGamePhase(from: GamePhase, to: GamePhase): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedGamePhaseTransitions(from: GamePhase): readonly GamePhase[] {
  return TRANSITIONS[from];
}

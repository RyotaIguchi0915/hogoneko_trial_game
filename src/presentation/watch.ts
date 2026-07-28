import type { AppView } from './appView';

/**
 * 見守りモード（自動送り）の純粋判定（EP-3.11）。
 *
 * 「見守る」は、不在の Segment（何もできない時間）を穏やかに自動で流し、
 * 在室（＝そっと世話できる瞬間）に到達したら手を止める——という観察ゲームのテンポ装置。
 * ⚠️ 進行の実体は runtime.advanceSegment()（決定論・G-3）。**いつ**呼ぶかを変えるだけで結果は変わらない。
 * ⚠️ 起動時に勝手に進めない（B2 §3）。見守りは必ずプレイヤーが「見守る」を押して始まる。
 * ⚠️ この層は Cat State に触れない（憲章 I-1）。判定に使うのは AppView（進行・行動枠）のみ。
 */

/** 見守りの1コマあたりの間（ms）。観察ゲームらしく穏やかに。 */
export const WATCH_TEMPO_MS = 1100;

/** 本編プレイ中で、まだ時間を進められる状態か（見守りを動かしてよい前提）。 */
export function isWatchable(view: AppView): boolean {
  return view.gamePhase === 'playing' && view.phase === 'running';
}

/**
 * 見守りを止めるべきか。本編を外れた/終わった時、または在室（行動枠あり＝世話できる）に達した時に止める。
 * ⚠️ 「進める前」ではなく「1コマ進めた後」の状態で判定する（押した瞬間に在室でも、まず一歩は進む）。
 */
export function shouldStopWatching(view: AppView): boolean {
  return !isWatchable(view) || view.actionSlots > 0;
}

import type { Rng } from '@core/index';
import type { CatState } from '@core/state/catState';
import {
  raiseNeedsPressure,
  updateVigilance,
  updateStressLoad,
  updateArousal,
  updateValence,
  updateRelationship,
  updateSafety,
} from './catDynamics';
import { selectBehavior } from './catAI';

/**
 * Segment Update — 1 Segment の完全計算順序（L2 Simulation / B5 §8.1）
 *
 * 「順序こそが仕様である」（B5 §8.2）。順序を変えると猫が1 Segment 前の情報で
 * 行動するように見え、因果が読めなくなる（SR-2 が破れる）。
 *
 * 【EP-2.01 の範囲】状態ダイナミクスのステップのみを、§8.1 の順序で実装する。
 *   本 Epic では以下を**フック（後続 Epic）**として空ける:
 *     step1-3  環境/人/Zone 更新        → EP-2.03（Environment は下記 context で注入）
 *     step5    刺激イベント適用          → EP-2.09
 *     step10   ToleranceDistance         → EP-2.03/2.05
 *     step14-17 行動トリガー/選択/実行/充足 → EP-2.02（Cat AI）
 *     step18-22 Trace/自己臭/Cue/関係機械/Gateway → EP-2.06/2.09/2.04
 *   したがって本関数は「入力が揃うまでの内部状態推移」を担い、行動選択には踏み込まない。
 */

export interface CatEnvironmentInput {
  /** ZoneSecurity（0..1）。EP-2.03 が供給。未供給時は中立（0.5）。 */
  readonly zoneSecurity: number;
  /** ZoneComfort（0..1）。未供給時は中立（0.5）。将来の充足計算で使用。 */
  readonly zoneComfort: number;
}

export interface SegmentContext {
  readonly day: number;
  readonly segment: number;
  /** 在室 Segment か（B2 §3.2）。不在は痕跡のみ（EP-2.06）。 */
  readonly inRoom: boolean;
  /** 環境入力。省略時は中立既定（EP-2.03 で本供給）。 */
  readonly environment?: CatEnvironmentInput;
  /** 行動選択の behavior ストリーム RNG（B5 §8.4）。省略時は argmax（EP-2.02）。 */
  readonly behaviorRng?: Rng;
}

const NEUTRAL_ENV: CatEnvironmentInput = { zoneSecurity: 0.5, zoneComfort: 0.5 };

/**
 * 1 Segment 分、猫の内部状態を推移させる（純粋・決定論的）。
 * §8.1 のステップ番号順に適用する。
 */
export function updateCatSegment(state: CatState, ctx: SegmentContext): CatState {
  const env = ctx.environment ?? NEUTRAL_ENV;

  // step4: 時間経過による Needs 圧の上昇（safety 以外）
  const needsAfterPressure = raiseNeedsPressure(state.needs);

  // step6: Vigilance（下降＝baseline へ。上昇は刺激駆動 EP-2.09/2.02）
  const vigilance = updateVigilance(state.affect);

  // step7: StressLoad（Vigilance の積分 − 減衰・上限0.8）
  const stressLoad = updateStressLoad(state.affect.stressLoad, vigilance);

  // step8: Arousal / Valence
  const arousal = updateArousal(state.affect.arousal, vigilance);
  const valence = updateValence(needsAfterPressure, state.relationship);

  const affect = { arousal, valence, vigilance, stressLoad };

  // step9: Relationship（在室で Familiarity 微増・Trust は日次）
  const relationship = updateRelationship(state.relationship, ctx.inRoom);

  // step11: N-01 安全欲求（Affect/Relationship/Zone に依存するため後段）
  const safety = updateSafety(affect, relationship, env.zoneSecurity);
  const needs = { ...needsAfterPressure, safety };

  // step14-15: Cat AI が更新後の状態から行動を選択（B6 / §8.1）。直接書き換えず新状態に載せる。
  const behavior = selectBehavior({ needs, affect, relationship }, ctx.behaviorRng);

  return {
    arrived: state.arrived,
    needs,
    affect,
    relationship,
    behavior,
  };
}

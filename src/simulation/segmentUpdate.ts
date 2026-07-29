import type { Rng } from '@core/index';
import type { CatState } from '@core/state/catState';
import { type CatProfile, NEUTRAL_PROFILE } from '@core/state/catProfile';
import {
  raiseNeedsPressure,
  updateVigilance,
  updateStressLoad,
  updateArousal,
  updateValence,
  updateRelationship,
  updateSafety,
  applyNeedSatisfaction,
  needsDistress,
} from './catDynamics';
import { selectBehavior } from './catAI';
import { selectZone, type ZoneChoice } from './zoneSelection';
import { applyStimulusVigilance, stimulusSensitivity } from './stimulus';

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
  /** 環境入力（＝現在地 Zone の導出環境）。省略時は中立既定（EP-2.03/3.02 で本供給）。 */
  readonly environment?: CatEnvironmentInput;
  /** ゾーン選択の候補（全 Zone の導出環境・EP-3.02）。省略時は移動しない（現在地据え置き）。 */
  readonly zones?: readonly ZoneChoice[];
  /** この Segment に突発刺激が起きたか（§8.1 step5・EP-3.06）。true なら警戒が跳ね上がる。 */
  readonly stimulus?: boolean;
  /** 情動アークのペース補正（短縮デモで弧を縮尺に・EP-3.09）。省略時 1（本編）。Familiarity の育ちに掛かる。 */
  readonly paceScale?: number;
  /** この子の個体プロファイル（EP-4.01）。省略時は中立（＝個体差なし・後方互換）。数値は L4 に出さない（I-1）。 */
  readonly profile?: CatProfile;
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
  const profile = ctx.profile ?? NEUTRAL_PROFILE; // 個体差（EP-4.01）。省略時は中立。

  // step4: 時間経過による Needs 圧の上昇（safety 以外）
  const needsAfterPressure = raiseNeedsPressure(state.needs);

  // step5: 突発刺激（音・驚き）→ Vigilance を跳ね上げる（上昇側・EP-3.06）。跳ね幅は個体の神経質さで変わる（EP-4.01）。
  const affectIn = ctx.stimulus
    ? applyStimulusVigilance(state.affect, stimulusSensitivity(profile))
    : state.affect;

  // step6: Vigilance（下降＝baseline へ。上昇は step5 の刺激＋満たされない欲求の不安・EP-3.07）。
  //   空腹が高いほど落ち着けず baseline が上がる → 世話（空腹を鎮める）が間接的に安心＝信頼を支える。
  //   神経質な子ほど baseline が高い（EP-4.01）。安全な場所ほど baseline が下がる（EP-4.04）。
  const vigilance = updateVigilance(
    affectIn,
    needsDistress(needsAfterPressure),
    profile.neuroticism,
    env.zoneSecurity,
  );

  // step7: StressLoad（Vigilance の積分 − 減衰・上限0.8）
  const stressLoad = updateStressLoad(affectIn.stressLoad, vigilance);

  // step8: Arousal / Valence
  const arousal = updateArousal(affectIn.arousal, vigilance);
  const valence = updateValence(needsAfterPressure, state.relationship);

  const affect = { arousal, valence, vigilance, stressLoad };

  // step9: Relationship（在室で Familiarity 微増・Trust は日次）。paceScale で弧を縮尺（EP-3.09）。
  //   社会性が高い子ほど慣れが育ちやすい（EP-4.01）。
  const relationship = updateRelationship(
    state.relationship,
    ctx.inRoom,
    ctx.paceScale,
    profile.sociability,
  );

  // step11: N-01 安全欲求（Affect/Relationship/Zone に依存するため後段）
  const safety = updateSafety(affect, relationship, env.zoneSecurity);
  const needs = { ...needsAfterPressure, safety };

  // step14-15: Cat AI が更新後の状態から行動を選択（B6 / §8.1）。直接書き換えず新状態に載せる。
  const behavior = selectBehavior({ needs, affect, relationship }, ctx.behaviorRng);

  // step16: 移動＝選んだ行動の遂行として次の現在地 Zone を決める（B5 §8.1 / B6 §2.7・B10 §5.2）。
  //   環境更新→安全→行動→移動 の順序を厳守（§8.2）。候補未供給時は現在地据え置き。
  const currentZone = ctx.zones
    ? selectZone(ctx.zones, { behavior, prevZone: state.currentZone }, ctx.behaviorRng, profile)
    : state.currentZone;

  // step17: 行動による Need 充足（eating→hunger 低下）。選択した行動の結果を反映。
  const satisfiedNeeds = applyNeedSatisfaction(needs, behavior);

  return {
    arrived: state.arrived,
    needs: satisfiedNeeds,
    affect,
    relationship,
    behavior,
    currentZone,
  };
}

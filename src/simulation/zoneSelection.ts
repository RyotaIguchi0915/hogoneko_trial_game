import type { Rng } from '@core/index';
import type { Behavior } from '@core/state/catState';
import { clamp01 } from './catDynamics';

/**
 * Zone Selection — 猫がどの Zone に居るかを選ぶ（L2 Simulation / B6 §2.7・B10 §5.2 / B5 §8.1 step16）
 *
 * B6/B10 では「場所選択」は独立 utility ではなく**移動行動の目的地**として現れる（行動の一部）。
 * MVP は行動選択（selectBehavior）と同型の温度付き softmax で、現在の行動に適した Zone を選ぶ。
 * ⚠️ 係数はすべて**仮値・監修待ち**（ZoneSecurity/Comfort 重み=SR-5 個体別化、zonePreference=24タイプ・B6 付録D）。
 *    方向のみが本質: 警戒/隠れ→遮蔽の効く refuge、探索→open、見張り→vantage。安全側と現在地慣性を優先。
 * ⚠️ 決定論: rng 省略時は argmax（候補順で安定タイブレーク）。RNG は behavior ストリーム流用（B5 §8.4）。
 */

/** 選択候補の Zone（導出済みの env と型のみ・Cat State を含まない）。 */
export interface ZoneChoice {
  readonly id: string;
  /** Zone 型（refuge/rest/vantage/resource/open/boundary・B10 §2.5）。 */
  readonly type: string;
  readonly security: number;
  readonly comfort: number;
}

export interface ZoneSelectionInput {
  readonly behavior: Behavior;
  /** 直前の現在地（慣性ボーナスに使う）。 */
  readonly prevZone: string;
}

/** 仮の重み（監修待ち）。 */
export const ZONE_SELECTION_PROVISIONAL = {
  security: 0.5,
  comfort: 0.3,
  /** 現在地に留まる慣性ボーナス（B6 Inertia 相当・頻繁なジッタを防ぐ）。 */
  inertia: 0.3,
  /** 行動が示す Zone 型への適合ボーナス。 */
  behaviorFit: 0.4,
  /** softmax 温度＝性格（selectBehavior と同水準・低いほど予測可能）。 */
  temperature: 0.15,
} as const;

/** 行動 → 適合する Zone 型（B6 §6 の移動行動の縮約・仮）。null は特定の選好なし。 */
const BEHAVIOR_ZONE_TYPE: Readonly<Record<Behavior, string | null>> = {
  hiding: 'refuge', // 遮蔽の効く退避先
  alert: 'vantage', // 見張れる高所
  exploring: 'open', // 開けた場所を歩く
  eating: 'resource', // 食器のある場所
  resting: 'rest', // 休息型（無ければ refuge が近い）
  grooming: null, // 現在地で行う（特定選好なし）
};

/** Zone の utility（相対値のみ意味を持つ・仮）。 */
export function zoneUtility(zone: ZoneChoice, input: ZoneSelectionInput): number {
  const P = ZONE_SELECTION_PROVISIONAL;
  const wantType = BEHAVIOR_ZONE_TYPE[input.behavior];
  const fit = wantType !== null && zone.type === wantType ? P.behaviorFit : 0;
  const inertia = zone.id === input.prevZone ? P.inertia : 0;
  return P.security * zone.security + P.comfort * zone.comfort + fit + inertia;
}

/**
 * 現在の行動・状態に適した Zone を選ぶ（B6 §2.5 温度付き softmax）。
 * @param rng behavior ストリームの RNG。省略時は argmax（決定論フォールバック）。
 */
export function selectZone(
  candidates: readonly ZoneChoice[],
  input: ZoneSelectionInput,
  rng?: Rng,
): string {
  if (candidates.length === 0) return input.prevZone; // 候補が無ければ据え置き
  const utils = candidates.map((z) => zoneUtility(z, input));

  if (!rng) {
    let best = 0;
    for (let i = 1; i < utils.length; i++) if (utils[i]! > utils[best]!) best = i;
    return candidates[best]!.id;
  }

  const tau = ZONE_SELECTION_PROVISIONAL.temperature;
  const maxU = Math.max(...utils);
  const exps = utils.map((u) => Math.exp((u - maxU) / tau));
  const sum = exps.reduce((a, b) => a + b, 0);

  let r = clamp01(rng.next()) * sum;
  for (let i = 0; i < candidates.length; i++) {
    r -= exps[i]!;
    if (r <= 0) return candidates[i]!.id;
  }
  return candidates[candidates.length - 1]!.id;
}

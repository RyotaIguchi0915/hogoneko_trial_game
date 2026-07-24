import type { CatState, Behavior } from '@core/state/catState';
import type { Phenomenon } from './Phenomenon';

/**
 * Perception Gateway — 真実（Truth）→ 現象（Phenomenon）変換の唯一の通過点
 * （L3 Perception / B4 P-01 / 憲章 I-1）
 *
 * ⚠️ 真実は「渡される」。Gateway は StateStore から pull しない（L3 は capability を持てない）。
 *    合成ルート（app）が L2 権限で真実を読み、本 Gateway に渡す。Gateway は数値を持たない
 *    Phenomenon のみを返す。これが観測境界の唯一の越境点である。
 * ⚠️ 出力に数値・真実参照・解釈を含めない（Phenomenon 型が構造的に保証・EP-10）。
 * ⚠️ 未定義語彙を動的生成しない（B4 P-02）。産出しうる descriptor は GATEWAY_DESCRIPTORS に閉じる。
 */

export interface ObservationConditions {
  /** 猫が在室 Segment にいるか（B2 §3.2）。不在なら直接観測は不可（痕跡は EP-2.06）。 */
  readonly inRoom: boolean;
  /** プレイヤーが観測しているか（P-03: 見ていない対象の情報は返さない）。 */
  readonly observing: boolean;
}

/** 猫の行動 → 観測可能な事実（descriptor）。解釈ではなく「見えたこと」。 */
const BEHAVIOR_TO_DESCRIPTOR: Readonly<Record<Behavior, string>> = {
  resting: 'phenomenon.curled_resting',
  hiding: 'phenomenon.out_of_sight',
  alert: 'phenomenon.ears_orienting',
  exploring: 'phenomenon.roaming',
  eating: 'phenomenon.at_food',
  grooming: 'phenomenon.self_grooming',
};

/** Gateway が産出しうる全 descriptor（未定義語彙の動的生成禁止の検証に使う・B4 P-02）。 */
export const GATEWAY_DESCRIPTORS: readonly string[] = Array.from(
  new Set([...Object.values(BEHAVIOR_TO_DESCRIPTOR), 'phenomenon.out_of_sight']),
);

/**
 * 真実から現象へ変換する（純粋）。
 * - 観測していなければ何も返さない（P-03）
 * - 不在 Segment では猫は直接見えない → out_of_sight
 * - 在室なら現在行動を観測可能な事実として返す
 */
export function toPhenomena(
  cat: CatState,
  conditions: ObservationConditions,
): readonly Phenomenon[] {
  if (!conditions.observing) return [];
  if (!conditions.inRoom) {
    return [{ subject: 'cat', descriptor: 'phenomenon.out_of_sight', observability: true }];
  }
  return [
    { subject: 'cat', descriptor: BEHAVIOR_TO_DESCRIPTOR[cat.behavior], observability: true },
  ];
}

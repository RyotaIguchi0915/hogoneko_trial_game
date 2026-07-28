import type { StateChange } from '@data/schemas/event';
import type { AttributeName } from '@data/schemas/environment';

/**
 * Event Effects — 発火イベントが Zone 属性へ及ぼす変化（L2 Simulation / B8 §2.3 / EP-3.03）
 *
 * イベントは「対象 Zone の物理属性（cover/height 等）」を変える（環境・資源のみ・§2.3、猫の内部状態は不可）。
 * ZoneSecurity/Comfort はその属性から B10 の式で**再導出**される（保存しない・AA-31）。EP-2.09 の
 * 「代表 Zone の security を直接調整」する簡略化を廃し、正式な属性ベースにする。
 * ⚠️ その後の猫の反応は Cat AI が自律的に決める。⚠️ 効果量は**仮値・監修待ち**（数値バランス＝人間ドメイン）。
 * ⚠️ params の数値は**加算デルタ**として解釈する（暫定・監修で set/add 意味論を確定）。
 */

/** 対象 Zone の属性への加算デルタ（Partial・EP-3.03）。 */
export type ZoneAttributeDelta = Readonly<Partial<Record<AttributeName, number>>>;

/** 発火が及ぼす1件の環境変化（どの Zone の属性をどれだけ変えるか）。 */
export interface EnvironmentChange {
  readonly zoneId: string;
  readonly attrs: ZoneAttributeDelta;
}

/** 仮の効果係数（監修待ち）。 */
export const EVENT_EFFECT_PROVISIONAL = {
  /** 隠れ場所（資源）追加の属性寄与（家具 hiding_box に相当・B10）。 */
  hideBox: { cover: 0.5, humanDistance: 0.2 },
} as const;

/** change.params から数値を取り出す（無ければ 0）。 */
function num(change: StateChange, key: string): number {
  const v = change.params?.[key];
  return typeof v === 'number' ? v : 0;
}

/**
 * 1つの StateChange を「対象 Zone の属性デルタ」に変換する（純粋・仮値）。
 * 対象 Zone（params.zone）が無い / 未知 command は null（効果なし）。方向（符号）のみが本質。
 */
export function environmentEffect(change: StateChange): EnvironmentChange | null {
  const zoneId = typeof change.params?.zone === 'string' ? change.params.zone : undefined;
  if (zoneId === undefined) return null;

  switch (change.command) {
    case 'setZoneCover':
      return { zoneId, attrs: { cover: num(change, 'cover') } };
    case 'setZoneHeightCover':
      return { zoneId, attrs: { height: num(change, 'height'), cover: num(change, 'cover') } };
    case 'placeHideBox':
      return {
        zoneId,
        attrs: {
          cover: EVENT_EFFECT_PROVISIONAL.hideBox.cover,
          humanDistance: EVENT_EFFECT_PROVISIONAL.hideBox.humanDistance,
        },
      };
    default:
      return null;
  }
}

/** 2つの属性デルタを成分ごとに加算する（純粋・累積用）。 */
export function mergeAttrDelta(a: ZoneAttributeDelta, b: ZoneAttributeDelta): ZoneAttributeDelta {
  const out: Partial<Record<AttributeName, number>> = { ...a };
  for (const [k, v] of Object.entries(b) as [AttributeName, number][]) {
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

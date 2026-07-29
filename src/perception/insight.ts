import type { ObservationEntry } from '@core/index';
import { HYPOTHESIS_TEMPLATES } from './hypotheses';

/**
 * Insight — 立てた仮説が、観察とどう噛み合っているか（L3 Perception / docs/06 §理解 / docs/18 B-C 後半）
 *
 * ⚠️ **これは採点ではない**（docs/06:616）。ここで数えるのは「**観察がどう並んだか**」であって、
 *    猫の真実（CatProfile）ではない。真実は import していないし、到達する手段も持たない（G-2）。
 *    したがって「仮説が正しいか」は、このモジュールにも他のどこにも存在しない。
 * ⚠️ 数値は**外に出さない**（憲章 I-1）。Insight は L4 に渡らず、描写解像度の判定にだけ使う
 *    （docs/06:363「確信度は数値ではなく描写の解像度に反映する」）。
 * ⚠️ 反証が優勢になっても**責めない**（docs/06:1291）。通知も警告も出さず、静かに解像度が戻るだけ。
 *    プレイヤーは「見え方が戻った」ことで、自分の見立てをそっと問い直す。
 */

export interface Insight {
  readonly hypothesisId: string;
  /** 仮説に沿う観測が起きた Segment 数。 */
  readonly supporting: number;
  /** 仮説に沿わない観測が起きた Segment 数。 */
  readonly contrasting: number;
  /**
   * 対比観測が成立したか（起きた／起きなかったの**両方**を見た・docs/06:126「反復＋対比＝仮説」）。
   * 片側しか見ていない間は、まだ推し量る材料が揃っていない。
   */
  readonly contrastObserved: boolean;
  /** 反証が優勢か。解像度を静かに戻す条件。⚠️ 閾値は仮値（監修・docs/19）。 */
  readonly refuted: boolean;
}

/** (day, segment) ごとに観測された descriptor の集合へまとめる。 */
function groupBySegment(log: readonly ObservationEntry[]): readonly ReadonlySet<string>[] {
  const map = new Map<string, Set<string>>();
  for (const e of log) {
    const key = `${e.day}/${e.segment}`;
    const set = map.get(key);
    if (set) set.add(e.descriptor);
    else map.set(key, new Set([e.descriptor]));
  }
  return [...map.values()];
}

/**
 * 観察履歴から Insight を導出する（純粋・決定論・真実を参照しない）。
 *
 * 1 Segment を 1 件として数える（同じ Segment で支持と反証が二重に立たない）。
 * `conditionedOn` を持つ仮説は、その現象が起きた Segment だけを材料にする（引き金つき）。
 */
export function deriveInsights(log: readonly ObservationEntry[]): readonly Insight[] {
  const segments = groupBySegment(log);
  return HYPOTHESIS_TEMPLATES.map((t) => {
    let supporting = 0;
    let contrasting = 0;
    for (const seen of segments) {
      if (t.conditionedOn !== undefined && !seen.has(t.conditionedOn)) continue;
      if (t.supportedBy.some((d) => seen.has(d))) supporting += 1;
      else if (t.contrastedBy.some((d) => seen.has(d))) contrasting += 1;
    }
    return {
      hypothesisId: t.id,
      supporting,
      contrasting,
      contrastObserved: supporting > 0 && contrasting > 0,
      refuted: contrasting > supporting,
    };
  });
}

/**
 * 立てた仮説によって観察文の解像度が上がる現象かどうか（docs/06:681）。
 *
 * ⚠️ **唯一の支援**。正誤は示さない。外れていることを告げもしない。
 * ⚠️ ただし**反証が優勢になった仮説では解像度が戻る**（EP-4.05・docs/06:1291）。
 *    これは罰ではない——見立てが観察と噛み合わなくなったとき、描写がもとの静けさに戻るだけ。
 * ⚠️ insights を渡さなければ反証判定を行わない（EP-4.03 時点の挙動と同じ）。
 */
export function isDetailed(
  descriptor: string,
  formed: readonly string[],
  insights: readonly Insight[] = [],
): boolean {
  const refuted = new Set(insights.filter((i) => i.refuted).map((i) => i.hypothesisId));
  const held = new Set(formed);
  return HYPOTHESIS_TEMPLATES.some(
    (t) => held.has(t.id) && !refuted.has(t.id) && t.detailFor.includes(descriptor),
  );
}

/**
 * 表示に使う descriptor を返す（解像度の反映）。
 *
 * 仮説を持ち、かつ反証されていなければ `<descriptor>.detailed` を返す。
 * ⚠️ 詳しい版の語彙が無い場合に備え、L4 は Localization の解決に失敗したら元の語に倒すこと。
 */
export function resolvedDescriptor(
  descriptor: string,
  formed: readonly string[],
  insights: readonly Insight[] = [],
): string {
  return isDetailed(descriptor, formed, insights) ? `${descriptor}.detailed` : descriptor;
}

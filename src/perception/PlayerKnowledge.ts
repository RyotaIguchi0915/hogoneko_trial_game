import type { ObservationEntry } from '@core/index';

/**
 * Player Knowledge — 観察履歴から再生成される「プレイヤーの理解」（L3 Perception / B7 / G-2）
 *
 * ⚠️ G-2（観測境界）: このモジュールは **Simulation（真実）を import しない**。理解は「見たこと」＝
 *    観察履歴（Phenomenon 由来・数値なし）だけから組み立てる。真実（Cat State）には決して到達しない。
 * ⚠️ **保存しない**。Player Knowledge は派生値であり、観察履歴から**再生成**する（B4 §9.2）。
 *    保存するのは元データ（観察履歴）だけ。ゆえにここは純粋関数のみ。
 * ⚠️ 語彙IDのまま返す（言語中立）。表示語への解決は L4（Localization）が担う（関心の分離）。
 *
 * MVP: 「何を・何回・いつ見たか」の集計まで。理解度/一般化（B7 の学習モデル）は監修後に拡充。
 */

/** 猫が直接見えなかった観測（不在 Segment 等）を表す語彙ID（PerceptionGateway と対応）。 */
const OUT_OF_SIGHT = 'phenomenon.out_of_sight';

export interface ObservedPhenomenonSummary {
  /** 現象語彙ID（観測可能な事実）。 */
  readonly descriptor: string;
  /** これまでに観測した回数。 */
  readonly count: number;
  /** 最後に観測した時（day/segment）。 */
  readonly lastSeen: { readonly day: number; readonly segment: number };
}

export interface PlayerKnowledge {
  /** 観測総数（記録された観察の件数）。 */
  readonly totalObservations: number;
  /**
   * これまでに見た事実の一覧。頻度降順→初出順で安定ソート（決定論・G-3）。
   * ⚠️ 数値は「回数（観測の事実）」であって内部状態ではない（I-1 を侵さない）。
   */
  readonly observed: readonly ObservedPhenomenonSummary[];
  /** 猫を直接見られた回数（out_of_sight を除く）。0 なら「まだ一度も見られていない」。 */
  readonly directSightings: number;
}

/**
 * 観察履歴から Player Knowledge を再生成する（純粋・決定論的）。
 * 履歴の順序に依存せず（初出順は index で安定化）、同じ履歴からは常に同じ理解が出る。
 */
export function derivePlayerKnowledge(log: readonly ObservationEntry[]): PlayerKnowledge {
  // descriptor ごとに count / 初出 index / 最後に見た時 を集計する。
  const acc = new Map<
    string,
    { count: number; firstIndex: number; lastSeen: { day: number; segment: number } }
  >();
  let directSightings = 0;

  log.forEach((entry, index) => {
    if (entry.descriptor !== OUT_OF_SIGHT) directSightings += 1;
    const existing = acc.get(entry.descriptor);
    if (existing) {
      existing.count += 1;
      existing.lastSeen = { day: entry.day, segment: entry.segment };
    } else {
      acc.set(entry.descriptor, {
        count: 1,
        firstIndex: index,
        lastSeen: { day: entry.day, segment: entry.segment },
      });
    }
  });

  const observed: ObservedPhenomenonSummary[] = Array.from(acc.entries())
    .map(([descriptor, v]) => ({
      descriptor,
      count: v.count,
      firstIndex: v.firstIndex,
      lastSeen: v.lastSeen,
    }))
    // 頻度降順、同数なら初出が先（決定論・安定）。
    .sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex)
    .map(({ descriptor, count, lastSeen }) => ({ descriptor, count, lastSeen }));

  return {
    totalObservations: log.length,
    observed,
    directSightings,
  };
}

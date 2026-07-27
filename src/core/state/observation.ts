/**
 * Observation Log — プレイヤーの観察履歴（L1 Core / B4 §9.2 Persisted / B7）
 *
 * プレイヤーが観測した Phenomenon の記録。**追記のみ・不変**（改竄不可・B4 §9.5）。
 * ⚠️ これは「猫の真実」ではなく「プレイヤーが見たこと」（Phenomenon 由来・数値を含まない）。
 *    ゆえに capability で保護しない。L3 Player Knowledge の**再生成元**になる（保存するのは履歴だけ・G-2）。
 * ⚠️ Phenomenon 型（L3）を直接持たない。保存可能な素の値（descriptor/subject 文字列）に落として持つ。
 */
export interface ObservationEntry {
  readonly day: number;
  readonly segment: number;
  /** 観測対象（cat / trace / furniture / sound） */
  readonly subject: string;
  /** 現象語彙ID（観測可能な事実） */
  readonly descriptor: string;
}

/** 観察履歴に追記する（追記のみ・既存を書き換えない）。 */
export function appendObservations(
  log: readonly ObservationEntry[],
  entries: readonly ObservationEntry[],
): readonly ObservationEntry[] {
  return entries.length === 0 ? log : [...log, ...entries];
}

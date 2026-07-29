/**
 * Phenomenon — 観測境界を越えられる唯一の形（L3 Perception / B4 P-01・§0 / 憲章 I-1）
 *
 * L4 Presentation が受け取れるのは Phenomenon のみ。**数値・真実参照・解釈を含まない**。
 *   ✅ 含んでよい: 観測可能な事実（descriptor / qualifier の語彙ID）、観測条件の成否
 *   ❌ 含んではならない: 警戒度0.73 / 内部状態への参照 / 「怖がっている」という解釈
 *
 * ⚠️ この型に数値フィールドを加えると、下の型レベルガードでコンパイルが落ちる（EP-10 の観測境界）。
 */

/**
 * 現象の対象（B4 P-01）。
 * place = 猫が今どこにいるか（EP-4.02b）／ time = その場面がいつのことか（EP-4.02d）。
 */
export type PhenomenonSubject = 'cat' | 'trace' | 'furniture' | 'sound' | 'place' | 'time';

export interface Phenomenon {
  readonly subject: PhenomenonSubject;
  /** 現象語彙ID（「棚の上にいる」等の観測可能な事実・B4 P-02）。 */
  readonly descriptor: string;
  /** 修飾語彙ID（「しばらく」等）。任意。 */
  readonly qualifier?: string;
  /** 観測条件を満たしたか（B4 P-01）。 */
  readonly observability: boolean;
}

// --- 型レベルの観測境界ガード（B4 P-01 / EP-10） ---
// Phenomenon のいずれかのフィールドが number 型なら、この型は真になり never 代入で落ちる。
type NumericFieldKeys<T> = {
  readonly [K in keyof T]-?: NonNullable<T[K]> extends number ? K : never;
}[keyof T];

// Phenomenon に数値フィールドが無いことをコンパイル時に保証する。
// 数値フィールドを足すと `NumericFieldKeys<Phenomenon>` が never でなくなり、この行が型エラーになる。
const _assertNoNumericFields: NumericFieldKeys<Phenomenon> extends never ? true : never = true;
void _assertNoNumericFields;

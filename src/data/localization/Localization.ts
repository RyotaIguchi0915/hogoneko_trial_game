/**
 * Localization System — キーから表示テキストへの解決（L0 Data / B4 D-02）
 *
 * 責務: テキストキー + 言語 + 置換パラメータ → 表示文字列。
 *
 * ⚠️ テキスト内で数値をフォーマットして返さない（D-02 禁止事項 / 憲章 I-1 の抜け道封じ）。
 *    → 置換パラメータの型を string に限定する。数値（Truth）を渡す経路を型で塞ぐ。
 *       そもそも Phenomenon は数値を持たないため、正しく設計すれば整形すべき数値は存在しない。
 * ⚠️ ハードコードされた表示文字列を許容しない（表示は必ずキー経由）。
 * ⚠️ 文中の語順固定を前提にしない（プレースホルダで語順は言語別に変えられる）。
 *
 * ⚠️ テキスト辞書の具体キー体系は Content Bible / OI-2 の管轄。ここは解決機構の骨格。
 */

/** 置換パラメータは文字列のみ（数値整形の禁止を型で強制）。 */
export type LocaleParams = Readonly<Record<string, string>>;

/** 言語 → (キー → テンプレート) の辞書。 */
export type LocalizationDictionary = Readonly<Record<string, Readonly<Record<string, string>>>>;

const PLACEHOLDER = /\{(\w+)\}/g;

export class Localization {
  readonly #dict: LocalizationDictionary;
  readonly #language: string;
  readonly #fallback: string;

  constructor(dictionary: LocalizationDictionary, language: string, fallbackLanguage?: string) {
    this.#dict = dictionary;
    this.#language = language;
    this.#fallback = fallbackLanguage ?? language;
  }

  get language(): string {
    return this.#language;
  }

  /** 言語を切り替えた新インスタンスを返す（状態は不変・辞書は共有）。 */
  withLanguage(language: string): Localization {
    return new Localization(this.#dict, language, this.#fallback);
  }

  has(key: string): boolean {
    return this.#lookup(key) !== undefined;
  }

  /**
   * キーを解決し、{name} 形式のプレースホルダを params で置換する。
   * - 現在言語 → フォールバック言語の順に探す
   * - 見つからなければ ⟨key⟩ を返す（無言で握りつぶさない・欠落を可視化）
   * - params に無いプレースホルダはそのまま残す（コンテンツ側のバグとして検出可能）
   */
  resolve(key: string, params?: LocaleParams): string {
    const template = this.#lookup(key);
    if (template === undefined) {
      return `〈${key}〉`;
    }
    if (!params) return template;
    return template.replace(PLACEHOLDER, (whole, name: string) =>
      Object.prototype.hasOwnProperty.call(params, name) ? params[name]! : whole,
    );
  }

  #lookup(key: string): string | undefined {
    return this.#dict[this.#language]?.[key] ?? this.#dict[this.#fallback]?.[key];
  }
}

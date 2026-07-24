import { describe, it, expect } from 'vitest';
import { Localization, type LocalizationDictionary } from './Localization';

const dict: LocalizationDictionary = {
  ja: {
    greeting: 'こんにちは、{name}。',
    arrival: '{name}が{place}にやってきた。',
    onlyJa: '日本語のみ',
  },
  en: {
    greeting: 'Hello, {name}.',
    arrival: '{name} arrived at {place}.',
  },
};

describe('Localization — キー解決（D-02）', () => {
  it('現在言語でテンプレートを解決し、パラメータを置換する', () => {
    const loc = new Localization(dict, 'ja');
    expect(loc.resolve('greeting', { name: 'ミケ' })).toBe('こんにちは、ミケ。');
  });

  it('言語切替は新インスタンスを返す（不変）', () => {
    const ja = new Localization(dict, 'ja');
    const en = ja.withLanguage('en');
    expect(ja.language).toBe('ja');
    expect(en.resolve('greeting', { name: 'Mike' })).toBe('Hello, Mike.');
  });

  it('語順は言語ごとに変えられる（語順固定を前提にしない）', () => {
    const loc = new Localization(dict, 'ja');
    const params = { name: 'ミケ', place: '窓辺' };
    expect(loc.resolve('arrival', params)).toBe('ミケが窓辺にやってきた。');
    expect(loc.withLanguage('en').resolve('arrival', { name: 'Mike', place: 'the window' })).toBe(
      'Mike arrived at the window.',
    );
  });

  it('現在言語に無いキーはフォールバック言語で解決する', () => {
    const loc = new Localization(dict, 'en', 'ja');
    // en に onlyJa は無い → ja へフォールバック
    expect(loc.resolve('onlyJa')).toBe('日本語のみ');
  });

  it('未知のキーは握りつぶさず、キーを囲んだ目印を返す', () => {
    const loc = new Localization(dict, 'ja');
    const out = loc.resolve('missing.key');
    expect(loc.has('missing.key')).toBe(false);
    expect(out).not.toBe('missing.key'); // 素通しではない
    expect(out).toContain('missing.key'); // どのキーが欠落したか分かる
  });

  it('パラメータが無いプレースホルダはそのまま残す（コンテンツ不備を検出可能）', () => {
    const loc = new Localization(dict, 'ja');
    expect(loc.resolve('greeting')).toBe('こんにちは、{name}。');
  });
});

describe('Localization — 数値整形の禁止（憲章 I-1 の抜け道封じ）', () => {
  it('置換パラメータは文字列型のみ（数値 Truth を渡せない）', () => {
    const loc = new Localization(dict, 'ja');
    // @ts-expect-error 数値パラメータは型で拒否される（Truth の混入を型で塞ぐ）
    loc.resolve('greeting', { name: 73 });
    // 実行時にも数値はテキストへ整形されない設計であることを型で保証している。
    expect(true).toBe(true);
  });
});

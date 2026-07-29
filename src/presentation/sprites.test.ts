import { describe, it, expect } from 'vitest';
import { SPRITES, SPRITE_KEYS, spriteForDescriptor, type SpriteKey } from './sprites';

/**
 * 猫を直接観測する現象語彙（L3 の BEHAVIOR_TO_DESCRIPTOR と 1:1）。
 * ⚠️ 語彙を増やしたらここにも足す。増やした語彙が既定の座り姿勢に潰れていないかを、下のテストが見張る。
 */
const CAT_DESCRIPTORS = [
  'phenomenon.curled_resting',
  'phenomenon.out_of_sight',
  'phenomenon.ears_orienting',
  'phenomenon.roaming',
  'phenomenon.at_food',
  'phenomenon.self_grooming',
] as const;

describe('spriteForDescriptor — 姿勢を語彙ごとに描き分ける（EP-4.02c / docs/16 §9 A-2）', () => {
  it('姿勢が見える5語彙は、すべて異なるスプライトになる（同じ絵に潰れない）', () => {
    // これが A-2 の本体。ここが潰れると観察文が違っても絵が同じになり、
    // 「〈場所〉で〈行動〉」の文脈（EP-4.02b）が絵の側で失われる。
    const visible = CAT_DESCRIPTORS.filter((d) => d !== 'phenomenon.out_of_sight');
    const keys = visible.map((d) => spriteForDescriptor(d));
    expect(keys.every((k) => k !== null)).toBe(true);
    expect(new Set(keys).size).toBe(visible.length); // 重複ゼロ＝フォールバックで潰れていない
  });

  it('隠れ/不在（out_of_sight）と未観測（undefined）は描かない', () => {
    expect(spriteForDescriptor('phenomenon.out_of_sight')).toBeNull();
    expect(spriteForDescriptor(undefined)).toBeNull();
  });

  it('未知の descriptor は既定の座り姿勢に倒す（描画は落ちない）', () => {
    expect(spriteForDescriptor('phenomenon.something_new')).toBe('cat_sitting');
  });

  it('返すキーには必ず実体のスプライトがある', () => {
    for (const d of CAT_DESCRIPTORS) {
      const key = spriteForDescriptor(d);
      if (key !== null) expect(SPRITES[key]).toBeTruthy();
    }
  });
});

describe('SPRITES — プレースホルダ資産の健全性', () => {
  it('全スプライトが自己完結の SVG data URI（外部リソースを参照しない）', () => {
    const prefix = 'data:image/svg+xml,';
    for (const key of SPRITE_KEYS) {
      const uri = SPRITES[key];
      expect(uri.startsWith(prefix)).toBe(true);
      const svg = decodeURIComponent(uri.slice(prefix.length));
      expect(svg).toContain('viewBox="0 0 100 100"');
      expect(svg).toContain('</svg>');
      // xmlns 以外に http が現れない＝外部画像・フォントを引かない（CSP / 著作権・docs/16 §7.3）
      expect(svg.replace(/xmlns="[^"]*"/g, '')).not.toContain('http');
    }
  });

  it('SPRITE_KEYS は SPRITES の全キーを網羅する', () => {
    expect(new Set(SPRITE_KEYS)).toEqual(new Set(Object.keys(SPRITES) as SpriteKey[]));
  });
});

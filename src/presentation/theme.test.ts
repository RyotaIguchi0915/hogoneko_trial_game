import { describe, it, expect } from 'vitest';
import {
  LIGHT,
  DARK,
  SCENE_LIGHT,
  SCENE_DARK,
  tokensFor,
  sceneColorsFor,
  pageStyle,
  cardStyle,
  pill,
  pillPrimary,
} from './theme';

describe('theme（ライト/ダーク配色・EP-3.12）', () => {
  it('tokensFor / sceneColorsFor がテーマで出し分ける', () => {
    expect(tokensFor('light')).toBe(LIGHT);
    expect(tokensFor('dark')).toBe(DARK);
    expect(sceneColorsFor('light')).toBe(SCENE_LIGHT);
    expect(sceneColorsFor('dark')).toBe(SCENE_DARK);
  });

  it('ライトとダークは別物（単純反転ではないが、地色・文字色は反転している）', () => {
    expect(DARK.ground).not.toBe(LIGHT.ground);
    // 地色は暗く、文字は明るく（明暗が入れ替わっている）。
    expect(DARK.ground < LIGHT.ground).toBe(true); // '#21…' < '#f7…'
    expect(DARK.ink > LIGHT.ink).toBe(true); // '#f0…' > '#5d…'
  });

  it('pageStyle はトークンの地色・文字色を反映する', () => {
    expect(pageStyle(DARK).background).toBe(DARK.ground);
    expect(pageStyle(DARK).color).toBe(DARK.ink);
    expect(pageStyle(LIGHT).background).toBe(LIGHT.ground);
  });

  it('cardStyle は surface と hair 枠線を反映する', () => {
    expect(cardStyle(DARK).background).toBe(DARK.surface);
    expect(cardStyle(DARK).border).toContain(DARK.hair);
  });

  it('pill は副（surface2）、pillPrimary はハチミツ色（今できること）', () => {
    expect(pill(DARK).background).toBe(DARK.surface2);
    expect(pillPrimary(DARK).background).toBe(DARK.honey);
    expect(pillPrimary(DARK).color).toBe('#ffffff');
    // pillPrimary は pill を土台にする（形は共通）。
    expect(pillPrimary(LIGHT).borderRadius).toBe(pill(LIGHT).borderRadius);
  });
});

/** hex / rgba から [r,g,b] を取り出す。 */
function rgb(color: string): readonly [number, number, number] {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = color.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
/** rgba の不透明度（hex は 1）。 */
function alpha(color: string): number {
  const m = /^rgba\([^)]*,\s*([\d.]+)\)/.exec(color);
  return m ? Number(m[1]) : 1;
}
const sum = (c: string) => rgb(c).reduce((a, v) => a + v, 0);

describe('theme — 木と光の原則（docs/16 §1.4 / §2.1 / §2.9）', () => {
  it('⚠️ 影に黒を使わない — 暖色であること（§1.4 の視覚原則）', () => {
    // 黒い影を1つ入れた瞬間に、部屋は冷たくなる。
    for (const s of [SCENE_LIGHT, SCENE_DARK]) {
      const [r, g, b] = rgb(s.shade);
      expect(r).toBeGreaterThan(b); // 赤みが青みより強い＝暖色
      expect(r + g + b).toBeGreaterThan(0); // 純黒ではない
    }
  });

  it('⚠️ 夜の寒色は窓だけ — 室内はすべて暖色のまま（§2.9）', () => {
    const [wr, , wb] = rgb(SCENE_DARK.window);
    expect(wb).toBeGreaterThan(wr); // 窓の外は青い
    // 床や壁に青を入れた時点で、この作品の温度が失われる。
    for (const key of ['bg', 'floor', 'furniture', 'woodPale', 'woodDeep', 'cat'] as const) {
      const [r, , b] = rgb(SCENE_DARK[key]);
      expect(r).toBeGreaterThanOrEqual(b);
    }
  });

  it('木目は「にじませる」低不透明度（§2.1.2）', () => {
    // はっきり描くと途端に安っぽくなる。
    for (const s of [SCENE_LIGHT, SCENE_DARK]) {
      expect(alpha(s.woodGrain)).toBeLessThanOrEqual(0.25);
    }
  });

  it('木は光の当たる面のほうが陰より明るい（階調が成立している）', () => {
    for (const s of [SCENE_LIGHT, SCENE_DARK]) {
      expect(sum(s.woodPale)).toBeGreaterThan(sum(s.woodDeep));
    }
  });

  it('ライトの窓は光そのもの、ダークの窓は夜の外（明暗が入れ替わる）', () => {
    expect(sum(SCENE_LIGHT.window)).toBeGreaterThan(sum(SCENE_DARK.window));
  });
});

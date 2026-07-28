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

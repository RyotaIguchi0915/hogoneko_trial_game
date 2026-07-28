import { useEffect, useState } from 'react';

/**
 * theme — 「やさしい観察画」の配色をライト/ダークで持つ（EP-3.12 / OI-4・docs/17）。
 *
 * この層は Cat State に触れない（憲章 I-1）。ここが扱うのは見た目のトークンだけ。
 * ⚠️ 本設計・本番アートの色は監修（docs/17 OI-4 / OI-6）。ここは叩き台の温かい配色。
 * ⚠️ ダークは「夜の静かな部屋・ハチミツ色の灯り」。単純反転ではなく、暖色のまま暗く落とす。
 */

export type Theme = 'light' | 'dark';

/** 画面トークン（App のカード/文字/ボタンで使う）。round は共通のフォントスタック。 */
export interface Tokens {
  readonly ground: string;
  readonly surface: string;
  readonly surface2: string;
  readonly ink: string;
  readonly ink2: string;
  readonly ink3: string;
  readonly hair: string;
  readonly honey: string;
  readonly sageSoft: string;
  readonly sageInk: string;
  readonly round: string;
}

const ROUND =
  '"Hiragino Maru Gothic ProN", "Rounded Mplus 1c", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", system-ui, sans-serif';

/** ライト（昼の陽だまり）。温かいクリーム＋ハチミツの差し色＋添えのセージ。 */
export const LIGHT: Tokens = {
  ground: '#f7efe0',
  surface: '#fffdf7',
  surface2: '#f4ecdd',
  ink: '#5d4c3f',
  ink2: '#93806e',
  ink3: '#bcab97',
  hair: '#ecdfc9',
  honey: '#e79a4d',
  sageSoft: '#e2ecdf',
  sageInk: '#5f7a67',
  round: ROUND,
};

/** ダーク（夜の静かな部屋）。暖色を保ったまま暗く。ハチミツは灯りのように少し明るく。 */
export const DARK: Tokens = {
  ground: '#211c17',
  surface: '#2b2620',
  surface2: '#35302a',
  ink: '#f0e7d8',
  ink2: '#c3b7a4',
  ink3: '#8f8574',
  hair: '#3d3730',
  honey: '#eaa459',
  sageSoft: '#2c352e',
  sageInk: '#a7c2ac',
  round: ROUND,
};

/** Canvas シーンの配色（drawScene 用）。CSS 変数が使えないので実値で持つ。 */
export interface SceneColors {
  readonly bg: string;
  readonly roomStroke: string;
  readonly floor: string;
  readonly furniture: string;
  readonly cat: string;
  readonly text: string;
}

export const SCENE_LIGHT: SceneColors = {
  bg: '#fff8ea',
  roomStroke: '#ecdfc9',
  floor: '#f3e6cf',
  furniture: '#e7d6b9',
  cat: '#c2a488',
  text: '#5d4c3f',
};

export const SCENE_DARK: SceneColors = {
  bg: '#2a241d',
  roomStroke: '#443d34',
  floor: '#322b23',
  furniture: '#3f362c',
  cat: '#b89a7e',
  text: '#f0e7d8',
};

/** テーマからトークン一式を選ぶ。 */
export function tokensFor(theme: Theme): Tokens {
  return theme === 'dark' ? DARK : LIGHT;
}

/** テーマから Canvas 配色を選ぶ。 */
export function sceneColorsFor(theme: Theme): SceneColors {
  return theme === 'dark' ? SCENE_DARK : SCENE_LIGHT;
}

function systemTheme(): Theme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * OS のカラースキーム（prefers-color-scheme）に追従する現在テーマ。
 * ⚠️ matchMedia 非対応環境（jsdom 等）では 'light' に倒す（テストは従来どおり）。
 */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(systemTheme);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setTheme(mq.matches ? 'dark' : 'light');
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return theme;
}

/** 画面いっぱいの温かい下地。中央にカードを置く。 */
export function pageStyle(t: Tokens) {
  return {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    background: t.ground,
    color: t.ink,
    fontFamily: t.round,
    padding: '1.5rem 1rem',
  } as const;
}

/** 中央のカード（まるく、やわらかい影）。 */
export function cardStyle(t: Tokens) {
  return {
    textAlign: 'center',
    lineHeight: 1.75,
    maxWidth: '26rem',
    width: '100%',
    background: t.surface,
    border: `1px solid ${t.hair}`,
    borderRadius: '24px',
    padding: '1.7rem 1.5rem 1.5rem',
    boxShadow: '0 22px 40px -30px rgba(0,0,0,.45)',
  } as const;
}

/** 丸薬型ボタン（副）。 */
export function pill(t: Tokens) {
  return {
    fontFamily: 'inherit',
    fontWeight: 700,
    fontSize: '0.85rem',
    letterSpacing: '0.02em',
    padding: '0.55rem 1.25rem',
    borderRadius: '999px',
    border: '2px solid transparent',
    background: t.surface2,
    color: t.ink2,
    cursor: 'pointer',
  } as const;
}

/** 丸薬型ボタン（主・ハチミツ色＝今できること）。 */
export function pillPrimary(t: Tokens) {
  return { ...pill(t), background: t.honey, color: '#ffffff' } as const;
}

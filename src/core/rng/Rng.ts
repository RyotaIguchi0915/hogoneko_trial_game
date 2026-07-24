/**
 * RNG Service — 決定論的乱数（L1 Core / B4 C-05）
 *
 * 本作の観察体験は再現性の上に成立する（B4 G-3 / B5 SR-3）。
 * 同一シード・同一入力なら、常に同一の結果でなければならない。
 * したがってグローバルな Math.random は使わない（AD-17）。
 *
 * 用途別に独立したストリームを持つ（B5 §8.4）:
 *   weather / behavior / trace / micro / profile
 * 一つのストリームの変更が他へ波及しないよう、fork で分離する。
 */

/** 用途別ストリーム名（B5 §8.4） */
export type RngStreamName = 'weather' | 'behavior' | 'trace' | 'micro' | 'profile';

export interface Rng {
  /** [0, 1) の一様乱数を1つ返し、内部状態を1ステップ進める */
  next(): number;

  /**
   * [minInclusive, maxExclusive) の整数を返す。
   * @throws maxExclusive <= minInclusive の場合（不正な範囲は握りつぶさない）
   */
  int(minInclusive: number, maxExclusive: number): number;

  /**
   * 用途別の独立したストリームを派生する。
   * 同一の (stream, salts) からは常に同一系列が得られる（元シード由来・消費状態に非依存）。
   * salts には day / segment / tick 等を渡す（B5 §8.4）。
   */
  fork(stream: RngStreamName, ...salts: number[]): Rng;

  /** セーブ用の内部状態（B4 §9.3 streamPositions）。restore で復元する */
  readonly state: number;
}

const UINT32 = 0x1_0000_0000; // 2^32

/**
 * mulberry32: 高速・軽量な決定論的 PRNG。
 * 32bit 状態を1ステップ進めて [0,1) を返す。
 */
function mulberry32Step(state: number): { value: number; nextState: number } {
  const a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / UINT32;
  return { value, nextState: a >>> 0 };
}

/**
 * fork 用のシード導出（FNV 風 + アバランチ）。
 * 元シード・ストリーム名・salts から 32bit シードを決定論的に生成する。
 */
function deriveSeed(originSeed: number, stream: string, salts: readonly number[]): number {
  let h = originSeed >>> 0;
  for (let i = 0; i < stream.length; i++) {
    h = Math.imul(h ^ stream.charCodeAt(i), 0x0100_0193) >>> 0;
  }
  for (const s of salts) {
    h = Math.imul(h ^ (s >>> 0), 0x0100_0193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb_352d) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

class SeededRng implements Rng {
  /** fork の基準となる不変の元シード（消費しても変わらない） */
  private readonly originSeed: number;
  /** 消費とともに進む可変状態 */
  private currentState: number;

  constructor(seed: number, state?: number) {
    this.originSeed = seed >>> 0;
    this.currentState = (state ?? seed) >>> 0;
  }

  get state(): number {
    return this.currentState;
  }

  next(): number {
    const { value, nextState } = mulberry32Step(this.currentState);
    this.currentState = nextState;
    return value;
  }

  int(minInclusive: number, maxExclusive: number): number {
    if (maxExclusive <= minInclusive) {
      throw new RangeError(
        `Rng.int: maxExclusive(${maxExclusive}) must be greater than minInclusive(${minInclusive})`,
      );
    }
    const span = maxExclusive - minInclusive;
    return minInclusive + Math.floor(this.next() * span);
  }

  fork(stream: RngStreamName, ...salts: number[]): Rng {
    return new SeededRng(deriveSeed(this.originSeed, stream, salts));
  }
}

/** 指定シードで RNG を生成する */
export function createRng(seed: number): Rng {
  return new SeededRng(seed);
}

/**
 * セーブから RNG を復元する（B4 §9.3）。
 * origin シードと保存された state から、消費位置を含めて再現する。
 */
export function restoreRng(seed: number, state: number): Rng {
  return new SeededRng(seed, state);
}

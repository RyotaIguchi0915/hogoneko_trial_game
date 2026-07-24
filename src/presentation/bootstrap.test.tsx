import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { bootstrap } from './bootstrap';
import { App } from './App';
import { createLocalStorageSaveStorage } from './localStorageStorage';

/**
 * EP-14 の実ブラウザ相当スモーク（jsdom + window.localStorage + React 描画）。
 *
 * 「開くと空のシーン → 時間が進む → リロードで状態が復元される」を、
 * ブラウザ API（localStorage）と実際の DOM 描画を通して確認する。
 * 「リロード」= 同じ localStorage を後ろ盾に bootstrap() を再実行すること。
 */
const fixedClock = () => 1_700_000_000_000;

describe('EP-14 Bootstrap smoke（localStorage + DOM）', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanup();
  });

  it('初回起動は「はじめから」で、空のシーン（…）を描画する', () => {
    const { view } = bootstrap({
      storage: createLocalStorageSaveStorage(),
      clock: fixedClock,
      seed: 12345,
    });

    render(<App view={view} />);
    expect(screen.getByLabelText('準備中').textContent).toBe('…');
    expect(screen.getByText('はじめから')).toBeInTheDocument();
    // 起動時に 1 Segment 前進している（初期 seg0 → seg1 → 表示 "2/6"）
    expect(screen.getByText(/1日目 ・ 2\/6/)).toBeInTheDocument();
  });

  it('リロード（同一 localStorage で再起動）すると前回の続きから継続する', () => {
    const storage = createLocalStorageSaveStorage();

    // 1回目の起動: seg0 → seg1、保存
    const first = bootstrap({ storage, clock: fixedClock, seed: 12345 });
    expect(first.view.restoreStatus).toBe('empty');
    expect(first.view.segment).toBe(1);

    // 2回目（リロード相当）: 保存済み seg1 を復元 → さらに seg2 へ
    const second = bootstrap({ storage, clock: fixedClock, seed: 999 /* 復元時は無視される */ });
    expect(second.view.restoreStatus).toBe('ok');
    expect(second.view.segment).toBe(2);

    render(<App view={second.view} />);
    expect(screen.getByText('前回の続きから')).toBeInTheDocument();
    expect(screen.getByText(/1日目 ・ 3\/6/)).toBeInTheDocument();
  });

  it('複数回リロードで日をまたいでも進行が保たれる', () => {
    const storage = createLocalStorageSaveStorage();
    // segmentsPerDay=6。6回起動すれば Day2 に入る。
    let last = bootstrap({ storage, clock: fixedClock, seed: 1 });
    for (let i = 0; i < 5; i++) {
      last = bootstrap({ storage, clock: fixedClock, seed: 1 });
    }
    expect(last.view.day).toBe(2);
    expect(last.view.restoreStatus).toBe('ok');
  });
});

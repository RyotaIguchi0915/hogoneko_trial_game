import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { bootstrap } from './bootstrap';
import { App } from './App';
import { createLocalStorageSaveStorage } from './localStorageStorage';

/**
 * EP-14/2.08/2.10 の実ブラウザ相当スモーク（jsdom + window.localStorage + React 描画）。
 *
 * 「開くとシーンが出る → 次へで時間が進む → 餌をやる（介入）→ リロードで復元」を、
 * ブラウザ API（localStorage）と実際の DOM 操作を通して確認する。
 */
const fixedClock = () => 1_700_000_000_000;

describe('Bootstrap / App smoke（localStorage + DOM）', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanup();
  });

  it('初回起動: Day1 Seg0 の初期表示。自動では進まない（プレイヤー駆動）', () => {
    const { runtime, view } = bootstrap({
      storage: createLocalStorageSaveStorage(),
      clock: fixedClock,
      seed: 12345,
    });
    expect(view.day).toBe(1);
    expect(view.segment).toBe(0); // 自動前進しない
    render(<App runtime={runtime} initialView={view} />);
    expect(screen.getByText('はじめから')).toBeInTheDocument();
    expect(screen.getByText(/1日目 ・ 1\/6/)).toBeInTheDocument();
  });

  it('「次へ」で Segment が進む', () => {
    const { runtime, view } = bootstrap({
      storage: createLocalStorageSaveStorage(),
      clock: fixedClock,
      seed: 12345,
    });
    render(<App runtime={runtime} initialView={view} />);
    fireEvent.click(screen.getByText('次へ'));
    expect(screen.getByText(/1日目 ・ 2\/6/)).toBeInTheDocument(); // seg0 → seg1
  });

  it('不在 Segment（Seg0）では餌やりは不可（行動枠0）', () => {
    const { runtime, view } = bootstrap({
      storage: createLocalStorageSaveStorage(),
      clock: fixedClock,
      seed: 12345,
    });
    expect(view.actionSlots).toBe(0); // Seg0=未明=不在
    render(<App runtime={runtime} initialView={view} />);
    expect(screen.getByLabelText(/餌をやる/)).toBeDisabled();
  });

  it('在室 Segment では餌やりが可能で、行動枠が減る（B2 §4）', () => {
    const { runtime, view } = bootstrap({
      storage: createLocalStorageSaveStorage(),
      clock: fixedClock,
      seed: 12345,
    });
    render(<App runtime={runtime} initialView={view} />);
    fireEvent.click(screen.getByText('次へ')); // Seg1=朝=在室（枠2）
    expect(screen.getByLabelText('餌をやる（残り2）')).toBeEnabled();
    fireEvent.click(screen.getByLabelText('餌をやる（残り2）'));
    expect(screen.getByLabelText('餌をやる（残り1）')).toBeInTheDocument(); // 枠が1減る
  });

  it('リロード（同一 localStorage で再 bootstrap）で進行が復元される', () => {
    const storage = createLocalStorageSaveStorage();
    const first = bootstrap({ storage, clock: fixedClock, seed: 12345 });
    first.runtime.advanceSegment();
    first.runtime.save();
    const segAfter = first.runtime.reader.getProgress().segment;

    const second = bootstrap({ storage, clock: fixedClock, seed: 999 });
    expect(second.view.restoreStatus).toBe('ok');
    expect(second.view.segment).toBe(segAfter);
  });
});

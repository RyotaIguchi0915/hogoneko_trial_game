import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { bootstrap, computeView } from './bootstrap';
import { App } from './App';
import { createLocalStorageSaveStorage } from './localStorageStorage';

/**
 * EP-14/2.08/2.10 の実ブラウザ相当スモーク（jsdom + window.localStorage + React 描画）。
 *
 * 「開くとシーンが出る → 次へで時間が進む → ご飯をあげる（介入）→ リロードで復元」を、
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

  it('不在 Segment（Seg0）ではご飯をあげられない（行動枠0）', () => {
    const { runtime, view } = bootstrap({
      storage: createLocalStorageSaveStorage(),
      clock: fixedClock,
      seed: 12345,
    });
    expect(view.actionSlots).toBe(0); // Seg0=未明=不在
    render(<App runtime={runtime} initialView={view} />);
    expect(screen.getByLabelText(/ご飯をあげる/)).toBeDisabled();
  });

  it('在室 Segment ではご飯をあげられて、行動枠が減る（B2 §4）', () => {
    const { runtime, view } = bootstrap({
      storage: createLocalStorageSaveStorage(),
      clock: fixedClock,
      seed: 12345,
    });
    render(<App runtime={runtime} initialView={view} />);
    fireEvent.click(screen.getByText('次へ')); // Seg1=朝=在室（枠2）
    expect(screen.getByLabelText('ご飯をあげる（残り2）')).toBeEnabled();
    fireEvent.click(screen.getByLabelText('ご飯をあげる（残り2）'));
    expect(screen.getByLabelText('ご飯をあげる（残り1）')).toBeInTheDocument(); // 枠が1減る
  });

  it('「次へ」で観察が観察ノート（Player Knowledge）に積まれる（EP-2.07）', () => {
    const { runtime, view } = bootstrap({
      storage: createLocalStorageSaveStorage(),
      clock: fixedClock,
      seed: 12345,
    });
    render(<App runtime={runtime} initialView={view} />);
    expect(screen.queryByLabelText('観察ノート')).toBeNull(); // 初期は履歴なし
    fireEvent.click(screen.getByText('次へ')); // Seg1 を観測 → 履歴に1件
    expect(screen.getByLabelText('観察ノート')).toBeInTheDocument();
  });

  it('リロードで観察履歴（Player Knowledge の元）も復元される（EP-2.07）', () => {
    const storage = createLocalStorageSaveStorage();
    const first = bootstrap({ storage, clock: fixedClock, seed: 12345 });
    first.runtime.advanceSegment();
    first.runtime.save();

    const second = bootstrap({ storage, clock: fixedClock, seed: 999 });
    expect(second.view.knowledgeNotes.length).toBeGreaterThan(0);
  });

  it('30日を終えると決定（迎える/お別れ）→絆で変わる結末になる（EP-3.08）', () => {
    const { runtime } = bootstrap({
      storage: createLocalStorageSaveStorage(),
      clock: fixedClock,
      seed: 1,
    });
    // 30日消化（runtime を直接進める）→ playing→deciding。
    for (let i = 0; i < 200 && runtime.reader.getProgress().phase === 'running'; i += 1) {
      runtime.advanceSegment();
    }
    render(<App runtime={runtime} initialView={computeView(runtime, 'ok')} />);
    // deciding: 二択が出る → 迎える → 結末の語り＋「つづける」→ epilogue → reflection（操作なし）。
    expect(screen.getByText('迎える')).toBeInTheDocument();
    expect(screen.getByText('お別れする')).toBeInTheDocument();
    fireEvent.click(screen.getByText('迎える'));
    expect(screen.getByLabelText('結末')).toBeInTheDocument();
    fireEvent.click(screen.getByText('つづける')); // ending → epilogue
    fireEvent.click(screen.getByText('つづける')); // epilogue → reflection
    expect(screen.getByLabelText('ふりかえり')).toBeInTheDocument();
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

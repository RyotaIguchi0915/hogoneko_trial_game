import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { bootstrap, computeView } from './bootstrap';
import { App } from './App';
import { createLocalStorageSaveStorage } from './localStorageStorage';

/**
 * 実ブラウザ相当スモーク（jsdom + window.localStorage + React 描画）。
 *
 * 「タイトル → はじめる → 観察 → ご飯をあげる → リロード復元 → 30日後の決定→結末」を、
 * ブラウザ API（localStorage）と実際の DOM 操作を通して確認する。
 */
const fixedClock = () => 1_700_000_000_000;

/** bootstrap して App を描画（新規プレイはタイトル画面から・EP-3.10）。 */
function openApp(seed = 12345) {
  const { runtime, view } = bootstrap({
    storage: createLocalStorageSaveStorage(),
    clock: fixedClock,
    seed,
  });
  render(<App runtime={runtime} initialView={view} />);
  return { runtime, view };
}
/** タイトルの「はじめる」を押して本編（playing）に入る。 */
function startApp(seed = 12345) {
  const r = openApp(seed);
  fireEvent.click(screen.getByText('はじめる'));
  return r;
}

describe('Bootstrap / App smoke（localStorage + DOM）', () => {
  beforeEach(() => {
    window.localStorage.clear();
    cleanup();
  });

  it('新規プレイはタイトル画面から始まる（EP-3.10）', () => {
    openApp();
    expect(screen.getByText('保護猫トライアル30日')).toBeInTheDocument();
    expect(screen.getByText('はじめる')).toBeInTheDocument();
  });

  it('「はじめる」で本編へ（Day1 Seg0・自動では進まない）', () => {
    startApp();
    expect(screen.getByText('はじめから')).toBeInTheDocument();
    expect(screen.getByText(/1日目 ・ 1\/6/)).toBeInTheDocument();
  });

  it('「次へ」で Segment が進む', () => {
    startApp();
    fireEvent.click(screen.getByText('次へ'));
    expect(screen.getByText(/1日目 ・ 2\/6/)).toBeInTheDocument(); // seg0 → seg1
  });

  it('不在 Segment（Seg0）ではご飯をあげられない（行動枠0）', () => {
    startApp();
    expect(screen.getByLabelText(/ご飯をあげる/)).toBeDisabled();
  });

  it('在室 Segment ではご飯をあげられて、行動枠が減る（B2 §4）', () => {
    startApp();
    fireEvent.click(screen.getByText('次へ')); // Seg1=朝=在室（枠2）
    expect(screen.getByLabelText('ご飯をあげる（残り2）')).toBeEnabled();
    fireEvent.click(screen.getByLabelText('ご飯をあげる（残り2）'));
    expect(screen.getByLabelText('ご飯をあげる（残り1）')).toBeInTheDocument(); // 枠が1減る
  });

  it('「次へ」で観察が観察ノート（Player Knowledge）に積まれる（EP-2.07）', () => {
    startApp();
    expect(screen.queryByLabelText('観察ノート')).toBeNull(); // 初期は履歴なし
    fireEvent.click(screen.getByText('次へ')); // Seg1 を観測 → 履歴に1件
    expect(screen.getByLabelText('観察ノート')).toBeInTheDocument();
  });

  it('リロードで観察履歴（Player Knowledge の元）も復元される（EP-2.07）', () => {
    const storage = createLocalStorageSaveStorage();
    const first = bootstrap({ storage, clock: fixedClock, seed: 12345 });
    first.runtime.start(); // タイトル→本編
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
    runtime.start(); // タイトル→本編（playing にしないと 30日消化で deciding へ遷移しない）
    for (let i = 0; i < 400 && runtime.reader.getProgress().phase === 'running'; i += 1) {
      runtime.advanceSegment();
    }
    render(<App runtime={runtime} initialView={computeView(runtime, 'ok')} />);
    // deciding: 二択 → 迎える → 結末の語り＋「つづける」→ epilogue → reflection（操作なし）。
    expect(screen.getByText('迎える')).toBeInTheDocument();
    expect(screen.getByText('お別れする')).toBeInTheDocument();
    fireEvent.click(screen.getByText('迎える'));
    expect(screen.getByLabelText('結末')).toBeInTheDocument();
    fireEvent.click(screen.getByText('つづける')); // ending → epilogue
    fireEvent.click(screen.getByText('つづける')); // epilogue → reflection
    expect(screen.getByLabelText('ふりかえり')).toBeInTheDocument();
  });

  it('リロード（同一 localStorage で再 bootstrap）で進行が復元され、タイトルを挟まない', () => {
    const storage = createLocalStorageSaveStorage();
    const first = bootstrap({ storage, clock: fixedClock, seed: 12345 });
    first.runtime.start();
    first.runtime.advanceSegment();
    first.runtime.save();
    const segAfter = first.runtime.reader.getProgress().segment;

    const second = bootstrap({ storage, clock: fixedClock, seed: 999 });
    expect(second.view.restoreStatus).toBe('ok');
    expect(second.view.gamePhase).toBe('playing'); // 復元はタイトルを挟まず本編へ
    expect(second.view.segment).toBe(segAfter);
  });
});

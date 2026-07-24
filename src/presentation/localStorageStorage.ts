import type { SaveStorage } from '@core/index';

/**
 * localStorage を後ろ盾にした SaveStorage（L4 Presentation）。
 *
 * Core（Save System / B4 C-06）は永続先を知らない。ブラウザ API への依存は
 * この層に閉じ込め、Core の純粋性と決定論を保つ。
 *
 * ⚠️ 書込失敗（容量超過・プライベートモード等）は例外を伝播させる。
 *    握りつぶさず SaveSystem に検出・通知させる（AA-75 / B4 §9.7）。
 */
export function createLocalStorageSaveStorage(): SaveStorage {
  return {
    read(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(key, value) {
      window.localStorage.setItem(key, value);
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // 削除失敗は無害（次回の書込で上書きされる）
      }
    },
  };
}

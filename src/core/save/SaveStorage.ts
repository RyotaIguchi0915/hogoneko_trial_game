/**
 * Save Storage — 永続領域への薄い出入口（L1 Core / B4 C-06 の Imperative Shell 側）
 *
 * SaveSystem はこの抽象にのみ依存する。具体の保存先（localStorage 等）は
 * 上位層（L4）が実装して注入する。これにより:
 *   - Core は特定のブラウザ API に縛られず、純粋なまま保てる
 *   - テストはメモリ実装で決定論的に往復検証できる（DevConst ⑩）
 *
 * ⚠️ 書込失敗（容量不足・権限）は握りつぶさず例外で伝える（AA-75 / B4 §9.7）。
 *    握るのは SaveSystem 側で、そこで検出・通知する。
 */
export interface SaveStorage {
  /** キーの値を返す。無ければ null。 */
  read(key: string): string | null;
  /** 値を書き込む。失敗時は例外を投げてよい（SaveSystem が検出する）。 */
  write(key: string, value: string): void;
  /** キーを削除する。 */
  remove(key: string): void;
}

/** テスト・非ブラウザ環境用のメモリ実装（純粋・決定論的）。 */
export function createMemorySaveStorage(
  seed?: Readonly<Record<string, string>>,
): SaveStorage {
  const map = new Map<string, string>(seed ? Object.entries(seed) : undefined);
  return {
    read: (key) => map.get(key) ?? null,
    write: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

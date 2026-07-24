# Architecture Decision Records (ADR)

アーキテクチャ上の重要な決定を、背景・選択肢・結果とともに記録する場所（DevConst ⑦⑫）。

## 目的

- 「なぜそう決めたか」を後から辿れるようにする（文書と実装の乖離防止・AD-72）。
- 技術選定・世界法則・数値バランス等の**人間専管事項**（DevConst ④）の決定過程を残す。

## 運用ルール

1. **採番**: `ADR-NNN-<slug>.md`（連番・ゼロ埋め3桁）。例: `ADR-002-scene-rendering.md`。
2. **雛形**: [`TEMPLATE.md`](./TEMPLATE.md) をコピーして起票する。
3. **Status ライフサイクル**:
   - `Proposed` → 議論中
   - `Accepted` → 採用（実装の根拠になる）
   - `Superseded by ADR-XXX` → 後続 ADR に置き換え（**ADR は削除しない**。履歴を残す）
   - `Deprecated` → 廃止
4. **一方向**: 決定を覆す場合も既存 ADR は残し、新しい ADR で `Supersedes` する。
5. **AI と人間の分担**: AI は選択肢と各案の Bible 適合性を提示する。**決定は人間が行う**（DevConst ④ / AD-76）。
6. **紐付け**: 関連 Epic / OI / Issue を明記し、実装 PR から該当 ADR を参照する。

## 一覧

| ADR | タイトル | Status |
|---|---|---|
| [ADR-001](./ADR-001-technical-stack.md) | 技術スタックの決定 | Accepted |

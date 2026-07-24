<!-- Development Constitution ⑨9.4 / ⑫ に準拠 -->

## 概要
<!-- 何を・なぜ。1〜2行 -->

Closes #

## Source of Truth
<!-- 準拠する Bible の該当箇所 -->
- 関連 Bible:
- 関連 Epic/Issue:

## Self Review（DevConst ⑫.2 / ③3.3）
- [ ] Project Constitution 不可侵条項 I-1〜I-10 に反しない
- [ ] 観測境界（L4→L2 参照なし）を守る
- [ ] G-2（Player Knowledge が Simulation を参照しない）を守る
- [ ] 数値を UI に露出しない（I-1）
- [ ] 禁止語彙を識別子・文字列に含まない（§10.2）
- [ ] Magic Number / God Class / 循環依存がない
- [ ] 決定論性を壊さない（`Math.random`/`Date.now` 不使用）
- [ ] 責務分離・データ駆動になっている
- [ ] TODO を放置していない

## Development Checklist（DevConst ⑭）
- [ ] A群 着手前
- [ ] B群 憲章適合（★全必須）
- [ ] C群 アーキテクチャ
- [ ] D群 コード品質
- [ ] E群 テスト

## テスト
<!-- 追加/更新したテストと結果 -->
- [ ] Unit
- [ ] Integration
- [ ] 決定論性（該当時）
- [ ] セーブ往復（該当時）

## ドキュメント更新（DevConst ⑦）
<!-- 仕様/設計変更なら更新した文書。なければ「なし」 -->

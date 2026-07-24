---
name: 実装タスク / Issue
about: Bible 準拠の実装タスク（Epic の分解単位）
title: '[Task] '
labels: [task]
assignees: ''
---

<!-- Development Constitution ⑫ / Sprint Epic 設計に準拠 -->

## 目的（何を・なぜ）
<!-- 1〜2 行。ビジネス価値ではなく「この Issue で何を成立させるか」 -->

## Source of Truth（準拠する Bible）
<!-- 実装は仕様に従う。該当箇所を必ず挙げる（DevConst ②） -->
- 関連 Bible / 節:
- 関連 Epic:
- 関連 ADR（あれば）:

## 受け入れ条件（Success Criteria）
<!-- 観測可能・検証可能な条件。Epic の Success Criteria を細分化する -->
- [ ]
- [ ]

## 完了の定義（Definition of Done）
<!-- 「何ができたら完了か」を一意に -->
- [ ] 実装が Source of Truth に一致
- [ ] `npm run verify` と `npm run build` が緑
- [ ] テスト追加（Unit / Integration / 決定論 / セーブ往復 のうち該当）
- [ ] 仕様/設計を変えた場合は該当文書を更新（DevConst ⑦）

## 対象範囲外（Out of Scope）
<!-- 混入を防ぐため明記 -->

## 依存 / ブロッカー
<!-- 依存する Issue・未解決事項（OI）など -->

## 憲章チェック（該当するもの）
- [ ] 観測境界（L4→L2 参照なし・憲章 I-1）に関わる
- [ ] Cat State（真実=数値）を扱う → L2 限定・Phenomenon 経由か
- [ ] 決定論性（`Math.random`/`Date.now` 不使用）に関わる
- [ ] 禁止語彙（好感度/懐き度 相当）に注意が要る

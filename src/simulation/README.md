# L2 — Simulation 真実層 🔒

**責務**: 実際に何が起きているかを計算する。猫の Needs / Affect / Relationship / Behavior、環境、痕跡、イベントルール。

**依存**: L1 Core / L0 Data のみ。**上位層（L3/L4）を参照しない**（B4 DR-2）。

**🔒 観測境界の内側**: 本層のデータ（数値=Truth）は **Perception Gateway を経由してのみ** 外に出る（B4 §0）。
**L4 Presentation は本層を import できない**（憲章 I-1 / eslint で強制）。

**禁止**: 数値をそのまま L3 以上へ渡す / プレイヤーの理解度を参照する（G-2）/ 猫の性格を実行中に変更（Pillar 5）/ `Math.random`・`Date.now`。

**参照 Bible**: B4 ③（S-01〜S-13）/ B5 / B6 / B9 / B10

**担当 Epic**: Sprint 2 以降

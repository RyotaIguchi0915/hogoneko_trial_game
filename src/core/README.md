# L1 — Core 基盤層

**責務**: 時間・状態保持・疎結合通信・決定論的乱数・保存・設定・計測・エラー。ゲームロジックを持たない。

**依存**: L0 Data のみ参照可。**上位層（L2/L3/L4）を知らない**（B4 DR-7）。

**含まれるもの**: Game Manager / Time System / State Store / Event Bus / **RNG Service（実装済）** / Save / Settings / Metrics / Error。

**禁止**: 上位層の参照 / `Math.random`（AD-17）/ `Date.now`（AD-38）→ 決定論性は RNG Service・Time System 経由。

**参照 Bible**: B4 ①（C-01〜C-09）/ B4 §6

**担当 Epic**: EP-04 Core Framework / EP-05 Time / EP-06 State / EP-07 EventBus & RNG / EP-08 Save

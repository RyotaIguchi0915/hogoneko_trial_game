# L4 — Presentation 表現層 🖥️

**責務**: 画面構成・入力・カメラ・音・演出。React + Canvas（ADR-001）。

**依存**: L3 Perception / L1 Core / L0 Data を参照可。**🔴 L2 Simulation を参照禁止**（憲章 I-1 / DR-3 / eslint で強制）。

**受け取ってよいもの**: L3 の出力（Phenomenon の言語化・描画情報）のみ。数値（Truth）には一切触れない。

**禁止**: 数値・ゲージ・%表示（I-1）/ 猫を覆い隠す（Pillar 1）/ 通知バッジ・アニメーションUI（AP-28/34）/ 情報階層3超（§9.5）。

**参照 Bible**: B4 ③（V-01〜V-06）/ B3（Player Flow）/ B7

**担当 Epic**: EP-14 Bootstrap（骨格）/ Sprint 7 UI

# ADR-001: 技術スタックの決定

**Status**: Accepted
**Date**: 2026-07-24
**Deciders**: 人間（Technical Director 承認）／ AI（選択肢提示）
**Epic**: EP-01 Technical Foundation Decision
**Resolves**: Master GDD OI-3（技術スタック未定義）

---

## Context

Development Constitution ④ により、技術選定は人間専管事項（AD-76）。
AI は選択肢と各案の Bible 適合性を提示し、人間が決定した。

### 要件（Bible 由来）

| 要件 | 出典 |
|---|---|
| Web ブラウザ（PC/スマホ）・インストール不要・通信断耐性 | 憲章§9.7 |
| 決定論的計算（同一シード→同一結果） | B4 G-3 / B5 SR-3 |
| 層境界を型で強制（L4→L2 禁止） | B4 §7.4 / EP-10 |
| 静かでミニマルなUI・派手な演出なし | Pillar 6 / AP-74 |
| 5年保守・OSS品質 | DevConst §1.2 |

---

## Decision

| 項目 | 採用 |
|---|---|
| **言語** | TypeScript |
| **UI** | React |
| **シーン描画** | Canvas 2D（必要に応じて後日 PixiJS を検討） |
| **ビルド** | Vite |
| **テスト** | Vitest + React Testing Library |
| **Lint** | ESLint（flat config）+ import 境界制限 + 識別子デニーリスト |
| **Format** | Prettier |
| **層境界の強制** | tsconfig paths + ESLint `import/no-restricted-paths` + CI 依存グラフ検証 |

### 決定理由

- **言語 TypeScript**: 型による層境界強制（EP-10）・Web ネイティブ・決定論計算のすべてに適合。ほぼ一意に決まる。
- **UI React**: 最大のエコシステム・知見・採用/引き継ぎのしやすさを重視。人間による選択。
- **シーン Canvas 2D**: 初期は最小構成。Pillar 6（静けさ）により WebGL の重装備は不要。アニメが複雑化した段階で PixiJS を再評価する（ADR で追記）。

### トレードオフの受容

- React はバンドルが重めで、モバイル無インストールのロード時間（§9.7）に不利。
  → **対策**: コード分割（Critical/Preload/Lazy、B4 §12.3）と、L4 のみ React に閉じる設計（L0〜L3 は純粋 TS でフレームワーク非依存）でロード最適化する。

---

## Consequences

### アーキテクチャ上の帰結

```
L0 data / L1 core / L2 simulation / L3 perception  → 純粋 TypeScript（React 非依存）
L4 presentation                                     → React + Canvas
```

- **観測境界（B4 §0）は L4=React が L2 を import できない構成で守る**（ESLint + tsconfig）。
- React は L3 Perception の出力（Phenomenon）のみを受け取り、L2 Simulation には一切触れない。

### 後続 Epic への影響

- EP-02: この決定に基づくスキャフォールド。
- EP-10: `import/no-restricted-paths` と CI 依存検証で境界違反6種を機械検出。
- EP-14: React で空のシーンを起動。

---

## 保留・再評価事項

| 項目 | 再評価の契機 |
|---|---|
| Canvas 2D vs PixiJS | シーンのアニメーションが Canvas 2D の性能を要求し始めたとき |
| 状態管理ライブラリの要否 | L4 の状態が複雑化したとき（既定は React 標準 + L3 との薄い接続） |

**⚠️ これらは ADR-002 以降で判断する。現時点で先回りして導入しない（YAGNI / AA-94）。**

---

## 改訂履歴

| バージョン | 日付 | 変更 |
|---|---|---|
| 1.0 | 2026-07-24 | 初版。React + Canvas を採用 |

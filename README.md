# 保護猫トライアル30日

観察・推理・環境改善シミュレーション（Web / PC・スマホ）。

> 猫は変わらない。変わるのは、見ている私たちのほうだ。

このゲームは猫を育てない・操作しない・攻略しない。プレイヤーが **観察し、推測し、試し、理解する** ことで、猫という他者の世界が少しずつ読めるようになっていく体験を提供する。

---

## ドキュメント

すべての仕様は `docs/` にある。**実装より仕様が優先される**（Development Constitution ②）。

| # | 文書 | 役割 |
|---|---|---|
| 00 | Project Constitution | ゲームの最上位規範（不可侵条項） |
| 01 | Experience Bible | 体験設計（Game Pillars） |
| 02 | Player Flow | 体験導線 |
| 03 | System Architecture | 5層・観測境界 |
| 04 | Simulation Rules | 世界法則 |
| 05 | Cat AI Design | 猫の意思決定 |
| 06 | Player Knowledge System | 学習体験 |
| 07 | Event System | 観察機会 |
| 08 | Progression / Economy / Balance | 進行・経済 |
| 09 | Room & Environment | 環境 |
| 10 | Master GDD | 統合設計書（最初に読む） |
| 11 | Development Constitution | 開発憲章（AI×人間の開発ルール） |
| 12 | Sprint 1 Foundation Epics | 基盤 Epic |
| — | `docs/adr/` | Architecture Decision Records |

⚠️ **未作成**: Core Gameplay Loop Bible（OI-1）/ Data Architecture Bible（OI-2）。Master GDD ⑮ 参照。

---

## アーキテクチャ（B4）

```
src/
  data/         L0 定義層     （純 TS・葉ノード）
  core/         L1 基盤層     （純 TS・時間/状態/RNG/保存）
  simulation/   L2 真実層 🔒  （純 TS・数値は境界を越えない）
  perception/   L3 知覚層 👁️  （純 TS・Truth→Phenomenon 変換）
  presentation/ L4 表現層     （React + Canvas・L2 参照禁止）
  content/      実データ
```

**観測境界（B4 §0）**: L4 は L2 を import できない（憲章 I-1）。これは ESLint / tsconfig / CI で機械的に強制する（EP-10）。

---

## 技術スタック（ADR-001）

TypeScript / React / Canvas 2D / Vite / Vitest / ESLint（層境界強制）/ Prettier

## セットアップ

```bash
npm install
npm run verify   # typecheck + lint + test
npm run dev      # 開発サーバ
```

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバ |
| `npm run build` | 型チェック + ビルド |
| `npm test` | テスト実行 |
| `npm run lint` | ESLint（層境界・禁止語彙・決定論性を検証） |
| `npm run verify` | typecheck + lint + test |

---

## 開発の作法

貢献フロー・ブランチ/PR 規約・ローカル検証は **[CONTRIBUTING.md](CONTRIBUTING.md)** に集約。
実装前に必ず **Development Constitution ⑭ Development Checklist** を通す。
特に以下は自動検証で守られる：

- 層境界（L4→L2 禁止）
- 禁止語彙（好感度/懐き度 相当の識別子）
- 決定論性（`Math.random` / `Date.now` 禁止）
- 循環依存・デバッグコード（`console`/`debugger`）

### ガバナンス

| 文書 | 役割 |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | 貢献ガイド（作法・層境界・検証・PR フロー） |
| [.github/pull_request_template.md](.github/pull_request_template.md) | PR テンプレート（Self Review + Development Checklist） |
| [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/) | Issue テンプレート（タスク / バグ / 仕様確認 OI） |
| [.github/CODEOWNERS](.github/CODEOWNERS) | レビュー責任者（憲章 I-1 境界ファイルを明示） |
| [docs/adr/](docs/adr/) | ADR（運用は [README](docs/adr/README.md)・雛形は [TEMPLATE](docs/adr/TEMPLATE.md)） |

CI（`.github/workflows/`）: `ci.yml`（typecheck / lint / format / coverage / build / devtools 除去検証）。

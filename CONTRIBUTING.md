# 貢献ガイド（CONTRIBUTING）

保護猫トライアル30日の開発規約。**AI・人間を問わず**このフローに従う。
根拠は `docs/11-DEVELOPMENT-CONSTITUTION.md`（開発憲章）。矛盾があれば憲章と各 Bible が優先する。

> **実装より仕様が優先される**（Development Constitution ②）。迷ったら `docs/` を読む。

---

## 1. 大原則（不可侵）

| 原則 | 内容 | 機械的強制 |
|---|---|---|
| **観測境界 I-1** | L4 Presentation は L2 Simulation を import しない。Cat State（真実=数値）は L2 限定 | ESLint `import/no-restricted-paths` |
| **決定論性 G-3** | `Math.random` / `Date.now` を L0〜L3 で使わない（RNG Service / Time System 経由） | ESLint `no-restricted-properties/globals` |
| **禁止語彙** | 「好感度/懐き度」相当の識別子を使わない（B0 §10.2） | ESLint `id-denylist` |
| **循環依存なし** | 同層の相互参照は Event Bus 経由 | ESLint `import/no-cycle` |

これらは規律ではなく**構造**で守る。破ると CI（`.github/workflows/ci.yml`）が赤くなる。
境界違反の検出は `src/architecture/boundary.test.ts` が恒久的に検証している。

---

## 2. 層構造（B4）

```
src/
  data/         L0 定義層     純 TS・葉ノード（他層を import しない）
  core/         L1 基盤層     純 TS・時間/状態/RNG/保存
  simulation/   L2 真実層 🔒  純 TS・数値は境界を越えない
  perception/   L3 知覚層 👁️  純 TS・Truth→Phenomenon 変換
  presentation/ L4 表現層     React + Canvas・L2 参照禁止
  content/      実データ
```

上位→下位のみ参照可。逆流・層飛ばしは禁止。

---

## 3. ローカル検証（コミット前に必ず）

```bash
npm run verify   # typecheck + lint + format:check + test（CI と同一構成）
npm run build    # 本番ビルドが通ること
```

`verify` は CI ゲート G0 と一致している。**ローカルで緑にしてから push する。**

| コマンド | 用途 |
|---|---|
| `npm run dev` | 開発サーバ |
| `npm test` / `npm run test:watch` | テスト |
| `npm run test:coverage` | カバレッジ計測 |
| `npm run format` | 自動整形 |

---

## 4. ブランチ / コミット / PR

- **`main` に直接コミットしない。** 必ず作業ブランチを切る（例: `feat/...`, `fix/...`）。
- コミットは小さく、意図が分かる粒度で。プレフィックス例: `feat` / `fix` / `docs` / `test` / `chore`。
- PR を出すと `.github/pull_request_template.md` の **Self Review + Development Checklist** が自動で現れる。
  Self Review 欄は自己点検用。記入を推奨する（マージの強制ゲートにはしない）。
- レビュー責任者は `.github/CODEOWNERS` が自動割当。憲章 I-1 の境界ファイルは特に慎重に。
- CI（typecheck / lint / format:check / test / build）が緑になってからマージする。

### Issue

`.github/ISSUE_TEMPLATE/` の3種から選ぶ:
- **実装タスク / Issue** … Bible 準拠の実装単位
- **バグ報告** … 再現手順・シード・Day/Segment を添える
- **仕様確認 / 未解決事項（OI）** … 人間判断が要る事項（決定は ADR 化）

---

## 5. 意思決定の記録（ADR）

技術選定・アーキテクチャ上の重要判断は `docs/adr/` に ADR として残す。
運用は `docs/adr/README.md`、雛形は `docs/adr/TEMPLATE.md`。

**技術選定・世界法則・数値バランスは人間専管事項**（DevConst ④）。
AI は選択肢と Bible 適合性を提示し、決定は人間が行い ADR に記録する。

---

## 6. ドキュメント更新（DevConst ⑦）

仕様・設計を変えたら、該当 Bible / ADR を**同じ PR で**更新する。文書と実装の乖離を残さない。

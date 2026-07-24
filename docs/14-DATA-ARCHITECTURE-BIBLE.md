# 保護猫トライアル30日 — B11 Data Architecture & Content Schema Bible v1.0

**Document Type**: Bible（B11）／ データ定義・スキーマ・命名の横断規約
**Status**: Proposed（技術規約は AI 提案・実装整合済み。現象語彙の完全リストは Content/監修 工程）
**Resolves**: Master GDD OI-2 / Architecture Y-07 / Event EV-02（構造のみ）
**Last Updated**: 2026-07-24

> **本書は「横断的な欠落」を埋める。** 各スキーマ（セーブ・イベント・環境）は既存 Bible に確定済みだが、
> **ID 命名規則・JSON の具体形式・ローカライズキー規則・現象語彙スキーマ**が横断的に未定義だった（Master GDD §15.1）。
> 本書はこれらを定義し、**Sprint 1 EP-09 で実装済みの Content Definition Registry / Localization（L0）と整合させる**。
> ⚠️ 現象語彙・イベント等の**実データ（完全リスト）は Content Bible / 監修工程の管轄**。本書は器と規則のみを定める。

---

## Source of Truth（統合元と整合先）

| 対象 | 出典スキーマ | 本書での扱い |
|---|---|---|
| セーブスキーマ | B4 §9.3 | 参照（§5） |
| イベント定義スキーマ | B8 §11 | 参照（§5） |
| 環境定義スキーマ | B10 §4/§9 | 参照（§5） |
| ID 命名規則 | — 未定義だった | **本書 §2 で定義** |
| JSON の具体形式 | — 未定義だった | **本書 §3 で定義** |
| ローカライズキー規則 | — 未定義だった | **本書 §4 で定義** |
| 現象語彙スキーマ | B4 P-02（構造のみ） | **本書 §6 で規則化**（リストは Content） |
| 実装（L0） | `src/data/`（EP-09） | **本書と一致させる** |

---

## 目次

- [① 原則](#-原則)
- [② ID 命名規則](#-id-命名規則)
- [③ JSON の具体形式](#-json-の具体形式)
- [④ ローカライゼーションキー規則](#-ローカライゼーションキー規則)
- [⑤ 既存スキーマの統合参照](#-既存スキーマの統合参照)
- [⑥ 現象語彙（Phenomenon Vocabulary）の規則](#-現象語彙phenomenon-vocabulary-の規則)
- [⑦ 検証と実装対応](#-検証と実装対応)
- [付録 A 未確定（Content/監修 工程）](#付録-a-未確定content監修-工程)

---

## ① 原則

| # | 原則 | 根拠 |
|---|---|---|
| D-1 | 定義は**不変**。実行時に書き換えない | B4 D-01 / 実装 `deepFreeze` |
| D-2 | 検証を通らない定義は**提供しない**（strict 起動で中止） | B4 D-01 / 実装 `ContentRegistryBuilder.build({strict})` |
| D-3 | **派生値・表示テキスト・数値(Truth)を定義に埋めない**（憲章 I-1） | B4 §9.2 |
| D-4 | 拡張は**定義追加のみ**で成立させる（コード変更を伴わない） | B0 §14.2 |
| D-5 | ID・語彙の**意味を後から変えない**（既存セーブとの乖離） | B4 §9.6 / AA-56/67 |

---

## ② ID 命名規則

### 2.1 形式

```
<kind>.<slug>          例: furniture.cat_tower / item.wet_food / cat.mike / phenomenon.gaze_away
```

| 規則 | 内容 |
|---|---|
| ID-1 | `kind` は種別（`furniture` / `item` / `room` / `cat` / `event` / `phenomenon` / `scenario` / `learningLine`） |
| ID-2 | `slug` は `[a-z0-9_]+`（小文字スネークケース）。空文字禁止 |
| ID-3 | ID は `kind` 内で一意（Registry は `kind` × `id` で解決） |
| ID-4 | ID は**不変**。一度公開した ID の意味を変えない（変えるなら新 ID + マイグレーション） |
| ID-5 | 言語非依存。ID に表示テキストを含めない（表示は §4 のキーで解決） |

> **実装対応**: EP-09 の `ContentDefinition.id: string`（非空）と `ContentRegistry`（`kind`×`id` 解決）に一致。
> 現状コードは「非空文字列」のみ強制。**本書の `<kind>.<slug>` 形式の正規表現検証は Sprint 2 で `defineSchema` に追加する**（付録 A・OI-2 残）。

### 2.2 設計ID との区別

Bible 内の設計ID（`SG-1` / `LL-6` / `EC-08` / `G-01` / `T-5` 等）は**文書の参照記号**であり、
コンテンツ ID ではない。コンテンツ ID は §2.1 の `<kind>.<slug>` を使う。両者を混同しない。

---

## ③ JSON の具体形式

### 3.1 ファイル構成

```
src/content/
  furniture/*.json      種別ごとにディレクトリ。1ファイル1定義 or 配列
  items/*.json
  rooms/*.json
  cats/*.json
  events/*.json
  phenomena/*.json
  scenarios/*.json
  locales/<lang>.json   ローカライズ辞書（§4）
```

### 3.2 フィールド規約

| 規則 | 内容 |
|---|---|
| JS-1 | フィールド名は **camelCase**（既存スキーマ `minDurationSegments` / `guaranteedInSpiral` に一致） |
| JS-2 | 各定義は必ず `id`（§2）を持つ |
| JS-3 | 参照は ID 文字列で持つ（`phenomenonId` 等）。実体を埋め込まない |
| JS-4 | **表示テキストを値に持たない**。テキストはローカライズキー（§4）で参照 |
| JS-5 | **数値(Truth)・派生値を持たない**（憲章 I-1 / D-3）。定義は「静的な性質」のみ |
| JS-6 | 列挙値（`channel: direct\|indirect\|sound` 等）は型/スキーマで許容値を制限 |
| JS-7 | 未知フィールドはスキーマ検証で不合格（B8 §11.4 の「禁止フィールド不在」に準拠） |

### 3.3 スキーマ版とマイグレーション

- コンテンツ全体に `schemaVersion` を持たせ、セーブと同じ一方向マイグレーション方針（B4 §9.6）に従う。
- フィールド追加=既定値補完、削除=無視、意味変更=マイグレーション必須（AA-77）。

---

## ④ ローカライゼーションキー規則

### 4.1 キー形式

```
<domain>.<subject>.<detail>     例: phenomenon.gaze_away.short / ui.save.saving / cat.mike.name
```

| 規則 | 内容 |
|---|---|
| L-1 | ドメイン接頭辞: `ui` / `phenomenon` / `narration` / `record` / `cat` / `event` / `system` |
| L-2 | キーは `[a-z0-9_.]+`。ドット区切りで階層化 |
| L-3 | **表示テキストは必ずキー経由**。コードに直書きしない（B10/D-02 / 実装 `Localization`） |
| L-4 | **数値をテキスト内で整形しない**（憲章 I-1 の抜け道封じ）。置換パラメータは**文字列のみ** |
| L-5 | 語順を固定しない。プレースホルダ `{name}` で言語ごとに語順を変えられる |
| L-6 | 未知キーは握りつぶさず可視化（実装は `〈key〉` を返す） |

> **実装対応**: EP-09 の `Localization`（`LocaleParams = Record<string,string>` で数値整形を型封鎖、`{name}` 置換、
> フォールバック、未知キーの可視化）に一致。**L-4 は型で構造的に強制済み**。

### 4.2 辞書構造

```json
// src/content/locales/ja.json
{
  "ui.save.saving": "保存しています…",
  "phenomenon.gaze_away.short": "目をそらした",
  "cat.mike.name": "ミケ"
}
```

言語追加は `locales/<lang>.json` の追加のみ（D-4）。

---

## ⑤ 既存スキーマの統合参照

**本書はスキーマを再定義しない。** 各定義スキーマは以下が Source of Truth：

| スキーマ | 定義箇所 | 要点 |
|---|---|---|
| セーブデータ | B4 §9.3 | Persisted/Transient/Derived の三分類・checksum・schemaVersion |
| イベント定義 | B8 §11（EventDefinition / CueSpec / StateChange / TerminationSpec / LearningLine） | `StateChange.target` に `cat.*` 不可（I-1 構造保証）・`playerUnderstanding` 型は存在しない（G-2） |
| 環境定義 | B10 §4/§9（Room / Furniture / Item） | 家具の寄与は属性加算・禁止フィールドの不在をスキーマ検証 |

**⚠️ これらのスキーマに数値(Truth)・派生値・表示テキストが混入していないことを、Registry が起動時に検証する（D-2/D-3）。**

---

## ⑥ 現象語彙（Phenomenon Vocabulary）の規則

Phenomenon は L2 の真実（数値）を L4 に渡す唯一の形式で、**数値を含まない現象**である（B4 P-02 / 憲章 I-1）。
本書は語彙の**スキーマと規則**を定める。**完全リストは Content Bible + Perception 設計（EV-02）の管轄**。

### 6.1 スキーマ（構造のみ）

| フィールド | 説明 | 必須 |
|---|---|---|
| `id` | `phenomenon.<slug>`（§2） | ✅ |
| `channel` | `direct` / `indirect` / `sound` | ✅ |
| `resolutionLevels` | 描写解像度ごとの表示キー（§4 のキー配列） | ✅ |
| `refutes` | 反証しうる仮説（学習の反証設計・B8） | — |

### 6.2 規則

| 規則 | 内容 |
|---|---|
| PH-1 | **数値フィールドを持たない**（型で禁止。憲章 I-1 の中核） |
| PH-2 | 語彙の**意味を後から変えない**（既存セーブとの乖離・AA-67） |
| PH-3 | 表示は解像度レベル × ローカライズキーで解決（数値を文字列化しない） |
| PH-4 | Cue（B8 CueSpec）は必ず定義済み phenomenon を指す（EQ034） |

> **⚠️ Phenomenon 型に数値フィールドを入れると EP-10 の境界テストで検出する**（Sprint 2 で Phenomenon 型実装時に `boundary.test.ts` へ追加）。

---

## ⑦ 検証と実装対応

すべての定義は **Content Definition Registry（D-01 / `src/data/registry`）** が起動時に検証する。

| 検証 | 実装（EP-09） | 本書の規則 |
|---|---|---|
| 非空 `id` | `defineSchema`（強制済み） | ID-2 |
| `<kind>.<slug>` 形式 | ⚠️ 未（Sprint 2 で追加） | ID-1/2 |
| 不正定義を提供しない | `build({strict})` で中止（E-2） | D-2 |
| 不変（凍結） | `deepFreeze`（済み） | D-1 |
| 表示テキストの型封鎖 | `LocaleParams`=string（済み） | L-4 |
| 未知フィールド不合格 | ⚠️ 各 `defineSchema` で個別に（Sprint 2 拡充） | JS-7 |

**⚠️ Sprint 2 での追補**: ID 正規表現検証 / 未知フィールド検出 / Phenomenon 数値禁止の境界テスト。
本書はこれらの**規則**を確定し、実装（`defineSchema`）への反映を Sprint 2 の Issue に残す。

---

## 付録 A 未確定（Content/監修 工程）

| 項目 | 管轄 | 出典 |
|---|---|---|
| 現象語彙の完全リスト | Content Bible + Perception 設計 | EV-02 |
| Cue ↔ Phenomenon の完全対応表 | 同上 | EV-02 |
| 実コンテンツ（家具・アイテム・猫個体・イベント本文） | Content Bible + 監修 | 各 Bible 付録C |
| ストレージ方式・容量見積 | Technical Design | Y-07 |

**⚠️ 人間承認事項（DevConst ④）**: 本書の技術規約（ID/JSON/ローカライズ）は AI 提案・実装整合済みだが、
**現象語彙・実コンテンツは世界法則/表現に踏み込むため、Content 工程で人間が確定する**。

---

## 改訂履歴

| バージョン | 日付 | 変更 |
|---|---|---|
| 1.0 | 2026-07-24 | 初版。ID/JSON/ローカライズ/現象語彙スキーマを定義し OI-2 を解消（Proposed）。EP-09 実装と整合 |

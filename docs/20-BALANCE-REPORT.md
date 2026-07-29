# 20 — バランス診断レポート（Emotional Arc Behavior Report）

> Status: Draft／2026-07-29 起稿
> **目的**: [docs/19 監修シート](19-SUPERVISION-SHEET.md) が挙げた最優先「①情動係数（§1）とティア閾値（§6）を
> 診断プレイスルーで詰める」の**素振り**。EP-4.01/4.04/4.06 実装時に採取した診断データを整理し、
> 現状の情動アークの挙動と、監修（数値決定）が判断すべき論点を具体化する。
> ⚠️ ここは**観測データと論点**であって、値の決定ではない（値は監修＝人間ドメイン）。
> **手法**: `src/app/_diag*.test.ts` を一時作成し GameRuntime を seed 固定で回し、`createTruthReader()` で
> profile / trust / vigilance / behavior / zone を fs 書き出し→読む（合格テストの console は RTK が消すため）。使い終わり削除。

---

## 1. 個体差は観測レベルで成立している（EP-4.01）

seed から生成される個体（4軸: neu 神経質 / cov 遮蔽 / hi 高所 / soc 社会性）は、行動・居場所・情動が明確に異なる。

| seed | 個体（隠れ値） | 傾向（観測） |
|---|---|---|
| 1 | neu.24 cov.31 hi.37 soc.79 | 穏やか・社交的。探索も豊富、3ゾーンを使い分け、よく慣れる |
| 2 | neu.74 cov.82 hi.35 soc.45 | 神経質・遮蔽好き。ほぼ隠れ、refuge に籠城 |
| 100 | neu.25 cov.31 hi.42 soc.74 | 動じにくく社交的。vantage もよく使う |
| 12345 | neu.79 cov.68 hi.59 soc.32 | 神経質・内向的。隠れっぱなし、人に遠い |

→ **論点なし（意図どおり）**。「毎回違う猫」は成立。監修は §2 のベース個体セットを 24 タイプ（docs/05:815）から確定するのが主。

## 2. 環境アクションは「合う個体」にだけ効く（EP-4.04・15日・本編ペース・世話なし）

| seed | 素の部屋 | ＋隠れ家（合） | ＋高い台（外） |
|---|---|---|---|
| 2（遮蔽好き・神経質） | trust **0.000** / vig **1.000** | trust **0.147** / vig 0.833 | 0.000 / 1.000（無効） |
| 100（社交的） | 0.170 / 0.653 | 0.270 | 0.209 |

→ **狙いどおり**「その子に合う環境だけが効く」が成立。
→ ⚠️ **論点A（重要）**: 世話なし・素の部屋の**神経質×遮蔽好き（seed 2）は trust 0・vig 1.0 に張り付く**（完全萎縮）。これは「理解して環境を用意しないと落ち着かない」という設計意図の表れだが、**プレイヤーが環境レバーに気づけないと"何をしても無駄"に見える**恐れ。監修判断: (a) 初期不安をやや緩める / (b) 素のゾーンに最低限の遮蔽を残す / (c) 観察で「隠れる場所を探している」等のヒントを十分出す（EP-4.03/4.05 と連動）。

## 3. デモ7日の結末分岐（EP-4.06・DEMO ペース paceScale≈4.29・世話/放置/世話＋隠れ家）

| seed | 世話 | 世話＋隠れ家 | 放置 |
|---|---|---|---|
| 1（穏やか社交） | bonded 0.945 | bonded 0.994 | **bonded** 0.648 |
| 2（神経質遮蔽） | bonded 0.626 | bonded 0.682 | warming 0.296 |
| 7 | bonded 0.754 | bonded 0.797 | warming 0.340 |
| 100（社交） | bonded 0.885 | bonded 0.923 | warming 0.336 |
| 12345（神経質内向） | **warming** 0.436 | warming 0.471 | distant 0.000 |

観測される良い性質:
- **世話は常に有効**（世話 > 放置・全 seed）。空腹の不快→警戒→の間接経路（I-2 準拠）が効いている。
- **隠れ家設置も常に上乗せ**（世話＋隠れ家 ≥ 世話）。
- **個体で難易度が違う**: 懐きやすい子（1）は放置でも bonded、難しい子（12345）は世話しても warming 止まり・放置だと distant。

→ ⚠️ **論点B**: 懐きやすい子（seed 1）は**放置でも bonded(0.648)**＝ケア差が出にくい。「見て・待って・整える」を怠っても良い結末になるのは、Pillar と噛み合うか監修判断（＝易しい子は元々そういうもの、で許容するか）。
→ ⚠️ **論点C**: 難しい子（seed 12345）は**世話しても warming 止まり**。「30日・正しい理解と世話で bonded に届く子ばかりではない」を良しとするか（リアル志向なら◎）、それとも全個体が努力で bonded 可能にするか。これは**bonded 閾値 0.55（docs/19 §6）と個体難易度のバランス**そのもの。

## 4. 監修の着手ポイント（docs/19 の §1/§6 に対応・優先順）

1. **bonded/warming 閾値（0.55 / 0.25・§6）× 個体難易度**を、望む結末分布から逆算する。
   - 現状: 世話ありで easy→0.9台 / 標準→0.6〜0.8 / hard→0.4台。閾値 0.55 だと hard は warming 止まり。
   - 決めること: 「努力すれば大半 bonded」か「hard は 30日で warming が上限」か。
2. **論点A（素の部屋の神経質個体の張り付き）**への対処（初期不安 / 素ゾーンの遮蔽 / 観察ヒント）。`initialCatState`（§7）・`vigilanceSecurityRelief`（§1）・素ゾーン設計（§5）が効く。
3. **論点B（易しい子の放置でも bonded）**: 放置時の trust 上昇を抑えるか（例 `trustDaily.gain` を下げ、`vigilanceSecurityRelief`/care 依存を上げる）は監修判断。
4. **paceScale（§7）検証**: デモ7日（×4.29）と本編30日で結末分布が質的に一致するか、seed をそろえて確認（本レポートはデモと本編ペースが混在＝要統一計測）。

## 5. 再計測のための手順（監修者向け）

一時診断テンプレ（使い終わり削除）:
```ts
// src/app/_diag.test.ts
const rt = GameRuntime.create({ storage: createMemorySaveStorage(), clock:()=>1000, seed, config });
rt.begin();
// 世話: 在室(isInRoomSegment)で rt.feed()×2 / 環境: rt.placeItem('hiding_place'|'high_perch')
for (let i=0;i<6*days;i++){ /* 必要なら世話 */ rt.advanceSegment(); }
const tier = rt.reader.getBondTier();
const cat = rt.createTruthReader().getCatState(); // trust / affect / behavior / currentZone
const prof = rt.createTruthReader().getCatProfile();
// fs.writeFileSync でテンポラリに書き出して読む
```
- **本編30日は `config` 省略（DEFAULT）／デモは `DEMO_TRIAL_CONFIG`**。ペースを揃えて比較する。
- 係数を1つ変える→同じ seed 群で before/after を見る、を繰り返す（docs/19 §1 の各行が対象）。

---

> 数値はコードが正（docs/19 参照）。本レポートの観測値は 2026-07-29 時点（EP-4.06 まで実装済み）の挙動。
> 係数を変えたら再計測して本レポートを更新する。

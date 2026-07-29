# 16a — アセット生成プロンプト集（OI-6 付属・作業用）

> Status: **Draft／2026-07-29**
> `docs/16`（Art Direction Bible）の付属資材。**絵柄の正は `docs/16`、本書はそれを生成AIに渡す形にしたもの**。
> 本書は運用中に何度も書き換わる（プロンプトは実験の産物）。**設計判断は必ず `docs/16` 側に書き戻すこと。**

---

## 0. 進め方（この順に、止まりながら）

```
STEP 1  基準画1体を出す（§1〜§3）      ← ここで人間が絵柄を確定。以降すべての親
   ↓    ⛔ 合格するまで先に進まない
STEP 2  基準画を採寸する（§4）          ← SVG化のための数値を取る
   ↓
STEP 3  ポーズ6種に展開（§5）          ← 同一個体を保つ
   ↓
STEP 4  背景2枚（§6）                  ← Zone データと構図を一致させる
   ↓
STEP 5  家具・小物・痕跡（§7）
   ↓
STEP 6  実装へ（docs/16 §7）
```

⚠️ **STEP 1 が全体の 8 割**。ここを妥協すると、以降のすべてがぶれる。

---

## 1. 基準画に使う個体（1体だけ・確定）

| 項目 | 値 | **なぜこの選択か** |
|---|---|---|
| 毛柄 | **キジ白**（`coat.tabby_white`） | **地色・縞・白の3要素が1枚に同時に写る**。無地だと模様レイヤの基準が取れず、三毛だと複雑さに目を奪われて絵柄の判断ができない。日本の保護猫で最多クラスという現実性も兼ねる |
| 体格 | 標準 | 中央値を先に決める。細身/むっちりは基準からの差分で作る |
| 耳 | **さくら耳（左）** | 保護猫のリアリティを**最初に**固定する。後から足すと絵柄全体の印象が変わる。外すのは簡単 |
| 目の色 | 琥珀 | 最も一般的。低彩度で温かい |
| 尻尾 | 中・まっすぐ | かぎ尻尾は個性が強く、絵柄そのものの判断を邪魔する。展開時に確認 |
| **ポーズ** | **座位・正面やや斜め（15°）** | **比率・シルエット・顔・線・接地影を一度に確認できる唯一のポーズ** |
| 背景 | 無地の生成り | 切り抜き検品のため。部屋には置かない |

> ⚠️ この個体は**実装には使わない**（`docs/16` §8 段階3）。SVG に落とすための**参照画**であって、ゲームに載る絵ではない。

---

## 2. 基準画プロンプト（ツール別・完成形）

### 2.1 Midjourney（v6 / v7）

```
soft hand-drawn children's picture-book illustration of a single sitting cat,
brown mackerel tabby and white (kijishiro) Japanese cat, standard build,
seen from the front turned 15 degrees, sitting upright with front paws together,
gentle rounded body, head-to-body ratio about 1 to 1.5, calm neutral face,
small round eyes with a single highlight, no visible mouth, amber eyes,
one ear tipped in a clean healed V notch, white chest and paws,
even dark-brown outline of consistent width, never black,
flat color fills with one soft warm shadow beneath the body,
warm cream background #f7efe0, soft natural daylight from the left,
quiet and gentle mood, full body visible, centered
--ar 1:1 --style raw --stylize 100
--no text, watermark, signature, black outline, harsh contrast, neon, glitter,
sparkles, anime big eyes, photorealism, 3D render, gradient background, gloss,
rim light, drop shadow, vignette, sad expression, angry expression, open mouth,
collar, ribbon, clothes, cage, blood, wound, multiple cats
```

⚠️ `--stylize` は **100 前後に抑える**。高いと Midjourney の作家性が勝ち、指示（特に「口を描かない」「目を大きくしない」）が無視される。

### 2.2 Flux（1.dev / 1.pro）

⚠️ **Flux にはネガティブプロンプトが無い。**「〜しない」は効かないので、**すべて肯定文に変換する**。ここが Midjourney との最大の違い。

```
A soft hand-drawn children's picture-book illustration of one sitting cat.
The cat is a brown mackerel tabby and white Japanese cat with a standard build,
facing the viewer turned 15 degrees, sitting upright, front paws together.
The body is gently rounded with a head-to-body ratio of about 1 to 1.5.
The face is calm and neutral, with small round amber eyes each holding a single
white highlight, a tiny pink triangular nose, three whiskers per side, and a
closed muzzle with no drawn mouth line. The left ear has a small clean healed
V-shaped notch at the tip. The chest and paws are white.
Every contour is drawn with an even dark brown line of consistent width.
Colors are flat and evenly filled, with a single soft warm shadow under the body.
The background is a plain warm cream color. Soft natural daylight comes from the
left. The whole body is visible and centered. The mood is quiet and gentle.
```

| Flux 設定 | 推奨 |
|---|---|
| guidance | 3.0〜3.5（高いと線が硬くなる） |
| steps | 28〜35 |
| aspect | 1:1 |
| seed | **固定する**（§5.2 の一貫性で使う） |

### 2.3 ChatGPT 画像生成（GPT Image）

会話で修正できるのが最大の利点。**一発で完成させようとせず、対話で追い込む**。

初回:

```
ゲーム用のキャラクター参照画を1枚作ってください。

絵柄: 手描きの絵本イラスト。均一な太さの濃い茶色の輪郭線（黒は使わない）。
      フラットな塗り。影は体の下に1つだけ、暖色でやわらかく。
被写体: 座っている猫を1匹だけ。キジ白（茶のサバ縞＋白い胸と足）。日本猫。
        正面から15度ふりむいた角度。前足をそろえて座る。
比率:   頭と胴の比が 1 : 1.5 のデフォルメ（2.5頭身くらい）。丸いフォルム。
顔:     穏やかで無表情。目は小さめの丸（顔の幅の1/6）にハイライト1点。琥珀色。
        口は描かない。鼻は小さな三角。ひげは片側3本。
特徴:   左耳の先が小さくV字にカットされている（さくら耳・治った跡できれい）。
背景:   無地の温かいクリーム色（#f7efe0）。全身が入る。中央。

避けてほしいこと:
黒い輪郭線、アニメ的な大きな目、感情表現（怒り・悲しみ・笑顔）、口を開ける、
グラデーション、光沢、リムライト、首輪やリボンや服、写実的な毛並み、3DCG、
キラキラした効果、複数の猫。
```

修正指示の例（実際によく必要になる）:

- 「目が大きすぎます。顔の幅の1/6まで小さくして、もっと穏やかに」
- 「輪郭線が黒すぎます。濃い茶色（#4a3b30）にして、太さを均一に」
- 「胴が短すぎます。頭と胴を 1:1.5 にしてください」
- 「影が黒いです。暖色のやわらかい影に」
- 「さくら耳が傷に見えます。きれいに治ったV字の切り込みに」

---

## 3. 検品チェックリスト（基準画の合否）

**全項目 ✅ で合格。1つでも ❌ なら作り直す。**「だいたい良い」で通すと、以降の全素材がずれる。

### 絵柄

- [ ] 輪郭線が**黒ではなく濃い茶**（`#4a3b30` 相当）
- [ ] 線の太さが**均一**（部位で太さが変わっていない）
- [ ] 線の端が**丸い**（尖っていない）
- [ ] 塗りが**フラット**（大きな面にグラデーションが乗っていない）
- [ ] **光沢・リムライト・ハイライトの帯**がない
- [ ] 影が**暖色**で、**体の下に1つだけ**（黒くない・複数方向でない）
- [ ] **接地している**（浮いていない）

### プロポーション（`docs/16` §3.1）

- [ ] 頭：胴 ≒ **1 : 1.5**（2頭身になっていない／写実的な細長さでもない）
- [ ] 輪郭に**鋭角がない**（頬・肩・尻がすべて円弧）
- [ ] 全身が入っており、**切れていない**

### 顔（`docs/16` §3.2〜3.3・**最重要**）

- [ ] 目が**頭幅の 1/6 以下**（アニメ的な巨大な目でない）
- [ ] 瞳孔が**縦長スリットでない**
- [ ] **口が描かれていない**
- [ ] **表情で感情を語っていない**（怒り・悲しみ・笑顔・不安のいずれにも読めない）
- [ ] 感情記号（汗・♥・💢・涙）が**ない**

### リアリティ

- [ ] さくら耳が**治癒済みのきれいなV字**（傷・血・欠けに見えない）
- [ ] 首輪・リボン・服・持ち物が**ない**
- [ ] 縞模様が**キジ白として自然**（虎柄になっていない）

### 実務

- [ ] 背景が無地で、**切り抜ける**
- [ ] 猫が**1匹だけ**
- [ ] 文字・ロゴ・署名が**ない**

### 最終検品：シルエットテスト（`docs/16` §3.1）

> 画像を単色に塗りつぶす（画像編集で明度を 0 に）。**シルエットだけで「座っている猫」と分かるか。**
> ここで曖昧なら、他がどれだけ良くても不合格。以降のポーズ展開で必ず破綻する。

---

## 4. 採寸（基準画が合格したら、必ずやる）

**基準画から数値を取り、`docs/16` §3.1 の表を確定値に書き換える。** これをやらないと SVG 化で絵柄が再現できない。

| 測る項目 | 記録欄 | 用途 |
|---|---|---|
| 全高（耳先〜接地） | `___ px` | 基準（100 に正規化） |
| 頭の幅 / 頭の高さ | `___ / ___` | §3.1 の頭 38 を検証 |
| 胴の高さ | `___` | §3.1 の胴 46 を検証 |
| 耳の高さ / 開き角 | `___ / ___°` | 耳パーツ |
| 目の中心位置（頭頂から下へ %） | `___%` | 顔パーツ |
| 目の直径 ÷ 頭幅 | `___`（目標 ≦0.17） | §3.2 |
| 輪郭線の太さ ÷ 全高 | `___`（目標 0.028） | §2.4 |
| 縞の本数 / 太さ | `___ / ___` | 模様レイヤ |
| 白の境界（胸の白がどこまで上がるか） | `___%` | 白レイヤ |
| 接地影の幅 ÷ 体幅 | `___` | 影 |

→ 採寸結果は **`docs/16` §3.1 と §4.2 に反映**（本書ではなく、バイブル側に書く）。

---

## 5. ポーズ展開（6種・現象語彙と1対1）

### 5.1 各ポーズのプロンプト

**共通**: §2 の基準画プロンプトから `sitting upright with front paws together` を差し替え、他は一字一句変えない。

| descriptor | 差し替える姿勢の記述 |
|---|---|
| **（基準）** | `sitting upright with front paws together, seen from the front turned 15 degrees` |
| `curled_resting` | `curled up asleep in a tight round ball, nose tucked toward the tail, seen from the side, ears neither flat nor alert, body forming a soft circle` |
| `ears_orienting` | `sitting still and upright, body facing forward, but both ears turned to the left toward something off-screen, eyes calm and open, no other movement` |
| `roaming` | `walking in profile from the side, all four legs visible in mid-stride, tail held horizontally, head level, calm` |
| `at_food` | `standing in front of a small ceramic bowl, head lowered toward it, front paws planted, tail resting on the floor, seen from the front turned 20 degrees` |
| `self_grooming` | `grooming itself, body folded, one hind leg raised, head turned down to lick the flank, small open mouth` |

⚠️ **`ears_orienting` が最も難しい**。生成AIは「耳だけ横」を理解せず、顔ごと向けたり警戒表情を足しがち。
→ 対処: 生成で近いものを出したら、**耳の角度だけを SVG 化の段階で作り込む**。ここは絵の正確さがゲームの正確さに直結する（`docs/16` §3.3）。

⚠️ **`self_grooming` は口の ω を許可する唯一のポーズ**（`docs/16` §3.2）。

### 5.2 同一個体を保つ方法（ツール別）

| ツール | 方法 |
|---|---|
| **Midjourney v7** | omni-reference `--oref <基準画URL>` + `--ow 100` |
| **Midjourney v6** | character reference `--cref <基準画URL>` + `--cw 100`（`--cw` は 100 で顔と服を最大参照） |
| **Flux** | **同一 seed を固定**し、姿勢の語句だけ差し替える。ぶれるなら Redux / IP-Adapter に基準画を渡す |
| **ChatGPT 画像生成** | **同じ会話を続けて**「同じ猫のまま、今度は〜しているところ」。会話を変えない |

⚠️ どの方法でも**完全一致はしない**。**一致させるのは絵柄であって、個体ではない**——最終的な個体差は SVG パーツ側（`docs/16` §4）が担うので、ここでの目的は「線・比率・顔の作り方を6ポーズで揃えること」。

---

## 6. 背景2枚（**Zone データと構図を一致させる**）

### 6.1 ⚠️ 構図はデータで決まっている

背景は自由に描けない。[src/content/environment.ts](src/content/environment.ts) が定義する **3つの Zone の属性が、そのまま構図の制約**になる。

| Zone | 家具 | lightLevel | humanDistance | noise/traffic | → **絵での位置** |
|---|---|---|---|---|---|
| `zone.vantage` | キャットタワー | **0.8（最も明るい）** | 0.5（中） | 低 | **窓の右隣・高い位置**（光が当たる高所） |
| `zone.open_floor` | クッション | 0.7 | **0.2（人に最も近い）** | **高** | **手前中央の床**（カメラ＝人に近い動線） |
| `zone.refuge` | 隠れ箱 | **0.3（最も暗い）** | **0.6（最も遠い）** | 最低 | **右奥の隅**（窓から遠い陰） |

> 光・距離・静けさが**データと絵で食い違うと、プレイヤーの推論が壊れる**。
> 「暗くて静かな隅にいる」という観察が、絵では明るい窓辺だった——これは `docs/18` B-B（文脈つき観察）を無効化する。

### 6.2 座標定義（正規化 0–1・1280×960 基準）

**この座標は背景生成の指示であると同時に、[drawScene.ts](src/presentation/drawScene.ts) が猫を配置する座標になる**（`docs/16` §9 A-3）。

| 要素 | x | y |
|---|---|---|
| 窓（奥壁・左寄り） | 0.08 – 0.34 | 0.12 – 0.46 |
| **zone.vantage**（キャットタワー） | 0.38 – 0.58 | 0.20 – 0.80 |
| └ 猫の立ち位置（上段） | 0.48 | 0.30 |
| **zone.refuge**（隠れ箱） | 0.72 – 0.94 | 0.52 – 0.78 |
| └ 猫の立ち位置（箱の中） | 0.83 | 0.68 |
| **zone.open_floor**（クッション） | 0.20 – 0.46 | 0.70 – 0.92 |
| └ 猫の立ち位置 | 0.33 | 0.82 |
| 食器（feed の対象） | 0.56 – 0.70 | 0.80 – 0.92 |
| 光だまり（昼） | 0.14 – 0.50 | 0.62 – 0.90 |
| **猫が動ける床の余白** | 0.30 – 0.75 | 0.55 – 0.95 |

### 6.3 `room-day`（昼）

```
soft hand-drawn children's picture-book illustration of a small quiet Japanese
room, seen from a fixed straight-on front view at eye level.
Light pine wooden floor with soft warm tones. A window on the upper left of the
back wall, soft natural daylight coming through it and pooling on the floor below.
A simple pine wood cat tower stands to the right of the window, its top platform
catching the light. In the far right corner, away from the window, sits a plain
cardboard hiding box on its side, its opening facing the viewer, in gentle shadow.
A round cream cotton cushion rests on the floor in the near center. A small
ceramic food bowl sits on the floor to the near right.
The center of the floor is open and empty. The room is empty, with no cat and no
people. Warm cream palette, flat colors, even dark-brown outlines, one soft warm
shadow per object, calm and quiet, tidy and cared for.
--ar 4:3 --style raw --stylize 100
--no cat, animal, person, text, watermark, clutter, mess, dark shadows, black
outline, cold blue tones, neon, photorealism, 3D render, gradient, gloss, vignette
```

### 6.4 `room-night`（夜）

```
（§6.3 と同一の構図・同一の家具配置）
+ at night. A warm low lamp glows from the lower right, casting long soft amber
light across the pine floor. The window shows deep blue night outside — this is
the only cool color in the picture. The room itself stays warm and amber, never
cold, never grey. The cardboard box corner is dark but still warm brown.
```

⚠️ **昼の絵に暗色フィルタをかけて夜にしない**（`docs/16` §2.9）。木が濁り、部屋が冷たくなる。必ず別に生成する。
⚠️ **窓の外だけが寒色**。床や壁に青を入れた時点で、この作品の温度が失われる。

---

## 7. 家具・小物・痕跡

### 7.1 家具（**実装の家具定義と1対1**）

[src/content/environment.ts](src/content/environment.ts) の `FURNITURE_CONTENT` に対応。**勝手に増やさない・名前を変えない**。

| 家具ID | 素材 | プロンプト（§2 のスタイル記述に続けて） |
|---|---|---|
| `furniture.cat_tower` | キャットタワー | `a simple two-level pine wood cat tower with a small carpeted top platform, isolated object on transparent background` |
| `furniture.hiding_box` | 隠れ箱 | `a plain cardboard box lying on its side, opening facing the viewer, slightly soft and worn, isolated object on transparent background` |
| `furniture.cushion` | クッション | `a round folded cream cotton cushion, slightly dented in the middle, isolated object on transparent background` |

⚠️ `docs/16` 初版で「棚（shelf）」と書いていたが、**実装は `cat_tower`**。本書が正。

### 7.2 小物（Zone に属さない・介入と将来の環境アクション用）

| id | プロンプト |
|---|---|
| `item-bowl` | `a small ceramic cat food bowl, cream glaze, seen from slightly above` |
| `item-water` | `a small ceramic water bowl with clear water` |
| `item-toy` | `a simple feather cat toy on a short wooden stick` |
| `item-brush` | `a small wooden pet brush with soft pale bristles` |
| `item-litter` | `a simple clean cream plastic cat litter box` |

### 7.3 痕跡（**不在の時間の主役**・優先度は小物より高い）

猫が居ない画面で、プレイヤーが見るのはこれだけ。

| id | 対応語彙 | プロンプト |
|---|---|---|
| `trace-hollow` | `warm_hollow` | `a cream cotton cushion with a round dent pressed into it, empty, no cat, soft and quiet` |
| `trace-fur` | `shed_fur` | `a few soft cat hairs resting on a cream cushion, very subtle, close view` |
| `trace-moved` | `moved_object` | `a small wooden object tipped over on a wooden floor, nothing broken, quiet` |
| `trace-food` | `food_reduced` | `a ceramic cat bowl half empty with a few kibbles left` |

⚠️ **`trace-hollow` が本作で最も重要な1枚**（`docs/16` §6.4）。「猫がここに居た」という不在の証明であり、この作品の情緒の核。**ここだけは何度でも作り直す価値がある。**

---

## 8. 反復の目安

| STEP | 生成回数の目安 | 判断 |
|---|---|---|
| 基準画 | **20〜40枚** | §3 の全項目 ✅ を1枚。ここは惜しまない |
| ポーズ展開 | 各 6〜10枚 | 絵柄が基準画と揃っているか |
| 背景 | **各 15〜30枚** | §6.1 の Zone 配置が守られているか。**構図が全編を貫くので妥協しない** |
| 家具・小物 | 各 4〜8枚 | 切り抜きやすさ優先 |
| 痕跡 | `trace-hollow` のみ 15枚+、他 4〜8枚 | 情緒が乗っているか |

**よくある失敗と対処:**

| 症状 | 原因 | 対処 |
|---|---|---|
| 目が大きく可愛くなりすぎる | モデルの既定バイアス | `--stylize` を下げる／「顔の幅の1/6」と数値で言う |
| 口を描いてしまう | 「猫＝口がある」の常識 | `closed muzzle with no drawn mouth line` と肯定文で |
| 表情が付く（不安げ・嬉しげ） | 「感情のある絵」への引力 | `calm neutral face` を複数回書く／生成後に目だけ差し替える |
| 輪郭が黒くなる | 既定 | `dark brown outline, never black` ＋ネガティブに `black outline` |
| 背景が勝手に部屋になる | 文脈補完 | `plain background` を強調／背景と猫を必ず別生成 |
| 夜が寒色になる | 「夜＝青」の常識 | `the room stays warm and amber, never cold` を明示 |

---

## 9. 生成物の受け入れ先

| 素材 | 置き場 | 形式 |
|---|---|---|
| 基準画・ポーズ参照画 | `docs/assets/reference/`（**リポジトリに置くが、ビルドには含めない**） | PNG |
| 背景 | `src/presentation/assets/` | WebP 1280×960 + @1x |
| 家具・小物・痕跡 | 同上 | WebP 512×512 透過 |
| UIアイコン | `src/presentation/icons/` | SVG（手描き・`currentColor`） |
| 猫 | **生成しない**（SVG コード合成） | `sprites.ts` |

⚠️ 参照画は**実装には使わない**が、**捨てない**。将来ポーズを追加するときの絵柄の基準になる。

---

> 参照: `docs/16` Art Direction Bible（絵柄の正）／`docs/17` OI-4 UI/UX ／`docs/18` コアループ再構築 ／
> [src/content/environment.ts](src/content/environment.ts)（Zone・家具の実定義）／[src/content/phenomena.ts](src/content/phenomena.ts)（現象語彙）

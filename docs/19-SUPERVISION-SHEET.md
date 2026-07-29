# 19 — 監修シート（Balance & Copy Supervision Sheet）

> Status: Draft／2026-07-29 起稿
> **目的**: コード各所に散在する「仮値（PROVISIONAL・監修待ち）」「閾値」「結末本文」を1枚に集約し、
> **人（監修）が実値を決めて埋める土台**にする。ここは"現状値の棚卸し"であり、正は各バイブル（B5/B6/B10/憲章）。
> **使い方**: 各項目の「監修メモ」欄に決定値・根拠を書き、コードの該当 file を更新する。すべて 0..1 か明記の値域。
> ⚠️ これらは「方向（符号・非対称・大小関係）」だけが確かで、**数値そのものは未確定**（AD-52/B0 §14.2）。

---

## 0. まず全体像

- **情動アークの骨子**（EP-3.05〜3.07）: 穏やかに過ごすと Trust が育つ（遅い）／ストレスで即崩れる（速い・非対称）。空腹の不快が警戒を上げ、世話は"間接的に"安心を支える（≠好感度メーター・I-2）。
- **個体差**（EP-4.01）: 4軸（神経質/遮蔽/高所/社会性）が seed 生成され、行動・場所・情動の効き方を個体化。**L4 に数値・タイプ名を出さない**（I-1）。
- **環境で応える**（EP-4.04）: 安全な場所は警戒を下げる → 「その子に合う環境を用意すると落ち着く」。
- **結末**（EP-4.06）: 3結末等価（迎える/もう少し見守る/送り出す・I-9）。「どれだけ理解して寄り添えたか」を映す。

---

## 1. 情動ダイナミクス係数 — `src/simulation/catDynamics.ts` `PROVISIONAL`

| 係数 | 現状値 | 意味・効果 | 監修メモ |
|---|---|---|---|
| needsRise.hunger | 0.12 | 1 Segment で空腹圧が上がる量 | |
| needsRise.elimination | 0.15 | 同・排泄 | |
| vigilanceDecay | 0.6 | 警戒が baseline へ戻る速さ（下降側） | |
| vigilanceBase | 0.15 | 警戒 baseline の下限 | |
| vigilanceStressGain | 0.5 | StressLoad が baseline を押し上げる強さ | |
| **vigilanceSecurityRelief** | 0.35 | **今いる場所の安全度が警戒を下げる強さ**（(ZoneSecurity−0.5)×これ）。EP-4.04 の肝＝環境が観察可能に効く | |
| needsDistress.hungerThreshold | 0.45 | この空腹を超えると不安が始まる | |
| needsDistress.vigilanceGain | 0.7 | 空腹の不快が警戒 baseline を押し上げる強さ | |
| stress.alpha / theta / beta / cap | 0.1 / 0.4 / 0.03 / 0.8 | StressLoad = α·max(0,Vig−θ)−β、上限 cap | |
| arousalTrack | 0.6 | Arousal が Vigilance を追う慣性 | |
| familiarityRise | 0.02 | 在室1 Segment の慣れの微増（ほぼ不可逆） | |
| safety.securityWeight / vigilanceWeight / trustRelief | 0.4 / 0.6 / 0.3 | 安全欲求圧 = w1·(1−Sec)+w2·Vig−w3·Trust | |
| satisfaction.eatingHungerRelief | 0.35 | eating 行動で空腹が下がる量 | |
| **trustDaily.gain / loss** | **0.04 / 0.15** | 日次 Trust: 穏やかな日の漸増 / ストレスの即時低下（**非対称 gain≪loss**） | |
| profile.neuroticismVigilanceGain | 0.2 | 神経質さ (neu−0.5) が警戒 baseline に効く強さ（EP-4.01） | |
| （社会性の効き） | 0.5+sociability | Trust/Familiarity の育ちに掛ける（0.5〜1.5倍・コード直書き） | |

## 2. 個体差 CatProfile — `src/simulation/catProfile.ts`

**4軸**（すべて 0..1・中立的特性・「良い/悪い気質」は無い）: neuroticism 神経質 / coverSeeking 遮蔽選好 / heightSeeking 高所選好 / sociability 社会性。
MVP は 8軸（B5 T-1〜T-8）のうち4軸。残り（活動/探索/順応/回復）は後続。

**ベース個体 `BASE_PROFILES`（5種・seed で1つ選び ±JITTER 変動）** — 正は `docs/05:815` の24タイプ:

| # | 通称（L4 非表示） | neu | cov | hi | soc | 監修メモ |
|---|---|---|---|---|---|---|
| 1 | 慎重観察型 | 0.75 | 0.70 | 0.60 | 0.30 | |
| 2 | 物怖じしない甘えん坊 | 0.25 | 0.30 | 0.40 | 0.80 | |
| 3 | 高所の見張り番 | 0.50 | 0.45 | 0.85 | 0.45 | |
| 4 | 内弁慶 | 0.70 | 0.85 | 0.30 | 0.40 | |
| 5 | おっとりマイペース | 0.30 | 0.50 | 0.50 | 0.55 | |

- `PROFILE_JITTER` = 0.08（各軸 ±0.08 の微小変動・完全ランダムにしない `docs/04:1910`）。
- 監修: ベース個体の数・軸値・MVP に載せる個体セット（24タイプからの抜粋方針）。

## 3. 行動選択・場所選択

| 係数 | 現状値 | 意味 | file | 監修メモ |
|---|---|---|---|---|
| AI_PROVISIONAL.temperature | 0.15 | 行動 softmax 温度＝性格（低=予測可能）。**将来は個体別（τ）** | `catAI.ts` | |
| ZONE_SELECTION.security / comfort | 0.5 / 0.3 | Zone utility の安全・快適の重み | `zoneSelection.ts` | |
| ZONE_SELECTION.inertia | 0.3 | 現在地に留まる慣性 | 〃 | |
| ZONE_SELECTION.behaviorFit | 0.4 | 行動→適合 Zone 型のボーナス | 〃 | |
| ZONE_SELECTION.preference | 0.4 | 個体の遮蔽/高所選好が refuge/vantage を押し引き（(軸−0.5)×これ・EP-4.01） | 〃 | |
| ZONE_SELECTION.temperature | 0.15 | 場所 softmax 温度 | 〃 | |
| ZONE_WEIGHTS.security | cover .25 / height .15 / exits .15 / sightline .1 / humanDistance .15 / traffic .2 / noise .15 / selfScent .15 | ZoneSecurity の導出重み（traffic/noise は負） | `environment/zone.ts` | |
| ZONE_WEIGHTS.comfort | thermal .3 / light .2 / softness .35 / selfScent .15 | ZoneComfort の導出重み | 〃 | |
| 行動候補 | resting/exploring/hiding/eating/grooming/alert | MVP 6種。utility 因子は `catAI.behaviorUtility` | `catAI.ts` | |

## 4. 突発刺激（環境音）— `src/simulation/stimulus.ts`

| 係数 | 現状値 | 意味 | 監修メモ |
|---|---|---|---|
| STIMULUS.chance | 0.14 | 1 Segment に突発音が起きる確率 | |
| STIMULUS.vigilanceSpike | 0.5 | 発生時に警戒へ加える跳ね上げ | |
| stimulusSensitivity | 0.5 + neuroticism | 個体の音への感度（0.5〜1.5倍・EP-4.01） | |

- 監修: 音の**種類・頻度・音源の語彙拡充**（現状「どこかで物音がした」1種）。

## 5. 介入・環境アクション

| 項目 | 現状値 | 意味 | file | 監修メモ |
|---|---|---|---|---|
| feedHungerRelief | 0.4 | ご飯で空腹が下がる量 | `interventions.ts` | |
| 行動枠 SLOTS_PER_IN_ROOM_SEGMENT | 2 | 在室1 Segment の介入回数 | `GameRuntime.ts` | |
| 設置 hiding_place → refuge | cover +0.7 / exits +1 / humanDistance +0.2 | 隠れ家（家具 hiding_box 相当）→ refuge が安全に | `GameRuntime.ts` | |
| 設置 high_perch → vantage | height +0.6 / cover +0.2 / sightline +0.4 / exits +1 | 高い台（cat_tower 相当）→ vantage が安全に | 〃 | |

- 監修: **素のゾーン設計**（EP-4.04 で refuge/vantage の据え置き家具を外した）と各設置の属性デルタのバランス。

## 6. 理解／絆ティア閾値 — `src/app/GameRuntime.ts` `#bondTier()`

| ティア | 条件（trust） | 語り（distant/warming/bonded の意味） | 監修メモ |
|---|---|---|---|
| bonded | trust ≥ **0.55** | 心をひらいてくれた | |
| warming | trust ≥ **0.25** | 少しずつ通じてきた | |
| distant | それ未満 | まだ遠い | |

- ⚠️ 「懐き度メーター」ではない（I-1）。EP-4.04 以降 trust は「性質を読み環境と世話で安心を満たせたか」を反映。
- 監修: 閾値と、将来「理解の証拠構造」（`docs/06` U0-U7・Insight）を加味するか（現状は trust 由来のみの MVP 代理指標）。

## 7. デモ／ペース

| 項目 | 現状値 | 意味 | file | 監修メモ |
|---|---|---|---|---|
| DEFAULT_TRIAL_CONFIG | 30日 × 6 Segment | 本編 | `core/time/TimeState.ts` | |
| DEMO_TRIAL_CONFIG | 7日 × 6 Segment | `npm run dev` のデモ尺 | 〃 | |
| paceScale | 30 / totalDays | 短縮デモで情動アークを縮尺再現（Trust/Familiarity の育ちに掛ける・EP-3.09） | `GameRuntime.ts` | |
| initialCatState | needs{safety .6, hunger .2, elim .2} / affect{arousal .3, valence −.2, vig .5, stress .2} / rel{trust .05, fam 0} / behavior hiding / zone refuge | 到着直後（警戒高め・隠れがち） | `core/state/catState.ts` | |

## 8. 結末本文 — `src/presentation/App.tsx`（`OUTCOME` / `REFLECTION` / `DECIDE_PROMPT`）

- **構造**: `OUTCOME[decision][tier]` = 3決定（adopt/extend/return）× 3ティア（bonded/warming/distant）×（ending＋epilogue）＝18対。`REFLECTION[tier]` ＝3。`DECIDE_PROMPT` ＝1。
- **監修方針**: 3結末は**等価**（I-9・送り出しを失敗として描かない）。数値を出さず、質的カテゴリで語る（I-1）。「この個体を理解する物語」であること。
- 現状は**プレースホルダ本文**（AI 起草）。**本文・トーン・言い回しの最終決定は監修**。→ 該当は App.tsx の該当 const を直接更新（表示テキストは locales でなく App 直書き・要検討: 監修容易化のため locales 化するか）。

## 9. 現象語彙（観察文）— `src/content/locales.ts` / `src/content/phenomena.ts`

- 「見えた事実だけ」を言う（解釈を書かない・B4 P-01）。現状の descriptor 一覧は該当 file 参照。
- 音（sudden_noise「どこかで物音がした」）・場所（EP-4.02b で追加）等。監修: 語彙の拡充・多解像度化・多言語。

---

## 監修の進め方（提案）

1. **情動係数（§1）とティア閾値（§6）**を先に（デモの手触り＝最優先）。診断プレイスルー（seed 固定・createTruthReader で trajectory/tier）で before/after を見ながら詰める。
2. **ベース個体（§2）**を24タイプ（`docs/05:815`）から確定（"学べる"個体か診断で確認）。
3. **結末本文（§8）**をトーン込みで確定。
4. **語彙（§9）・環境（§5）**を拡充。

> 各節の値はコードが正。本書と乖離したら**コードを正としてここを更新**する。

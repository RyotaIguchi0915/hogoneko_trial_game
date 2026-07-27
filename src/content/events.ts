/**
 * イベント/学習ライン content（実データ / B8 §7.3・§9.2 / EP-2.09）
 *
 * ⚠️⚠️ すべて**仮値・監修待ち**（Content Bible / B8 付録B.3 EV-01〜EV-03 の管轄）。
 *   確定が要るもの: イベント本文（internalName/効果量 params）・Cue 文言・発火 Day・3文脈の具体。
 *   ここは「1学習ライン分の最小構成」を**スキーマ検証が通る形**で置いた叩き台である。
 *
 * 学習ライン LL-1「安心できる場所の条件」（G-03 環境に反応する・Day 1-6・依存なし・B8 §7.3）。
 *   - 各イベントは direct + indirect の Cue を持ち、うち1つ（痕跡）は悪循環でも観測可能（guaranteedInSpiral・§8.4）。
 *   - Cue は既存の現象語彙（src/content/phenomena.ts）を参照する（未定義語彙を作らない・B4 P-02）。
 *   - StateChange は環境・資源のみ（猫の内部状態は型・schema で不可・§2.3）。
 *   - 役割は T-1 導入 / T-3 対比 / T-4 検証 / T-5 反証 を最小限そろえる（§1.4）。
 */

export const LEARNING_LINE_CONTENT: readonly unknown[] = [
  {
    id: 'line.safe_place',
    insightTheme: 'safe_place_conditions', // 内部名（非表示）
    generalization: 'G-03',
    contexts: ['context.hide_spot', 'context.open_space', 'context.height'],
    events: [
      'event.safe_place.seeding',
      'event.safe_place.contrast',
      'event.safe_place.verification',
      'event.safe_place.falsifying',
    ],
  },
];

export const EVENT_CONTENT: readonly unknown[] = [
  // T-1 導入: 遮蔽のある隠れ場所ができる。
  {
    id: 'event.safe_place.seeding',
    internalName: '隠れ場所ができる',
    learningLine: 'line.safe_place',
    role: 'seeding',
    difficulty: 1,
    trigger: { type: 'time', params: { day: 1 } },
    changes: [
      {
        target: 'environment',
        command: 'setZoneCover',
        params: { zone: 'zone.shelf', cover: 0.8 },
      },
    ],
    cues: [
      { channel: 'direct', phenomenon: 'phenomenon.out_of_sight', condition: 'inRoom' },
      { channel: 'indirect', phenomenon: 'phenomenon.warm_hollow', guaranteedInSpiral: true },
    ],
    termination: { type: 'duration', params: { segments: 1 } },
  },
  // T-3 対比: 遮蔽のない開けた場所との対比。
  {
    id: 'event.safe_place.contrast',
    internalName: '開けた場所しかない',
    learningLine: 'line.safe_place',
    role: 'contrast',
    difficulty: 1,
    trigger: { type: 'time', params: { day: 2 } },
    changes: [
      {
        target: 'environment',
        command: 'setZoneCover',
        params: { zone: 'zone.floor_open', cover: 0.1 },
      },
    ],
    cues: [
      { channel: 'direct', phenomenon: 'phenomenon.roaming', condition: 'inRoom' },
      { channel: 'indirect', phenomenon: 'phenomenon.shed_fur', guaranteedInSpiral: true },
    ],
    termination: { type: 'duration', params: { segments: 1 } },
  },
  // T-4 検証: 条件を満たす場所を足すと使う。
  {
    id: 'event.safe_place.verification',
    internalName: '条件を満たす場所を足す',
    learningLine: 'line.safe_place',
    role: 'verification',
    difficulty: 2,
    trigger: { type: 'time', params: { day: 3 } },
    changes: [{ target: 'resource', command: 'placeHideBox', params: { zone: 'zone.nook' } }],
    cues: [
      { channel: 'direct', phenomenon: 'phenomenon.curled_resting', condition: 'inRoom' },
      { channel: 'indirect', phenomenon: 'phenomenon.warm_hollow', guaranteedInSpiral: true },
    ],
    termination: { type: 'stateCondition', params: { zone: 'zone.nook' } },
  },
  // T-5 反証: 「高ければ安心」の単純化を崩す（高いが遮蔽なしは使わない）。
  {
    id: 'event.safe_place.falsifying',
    internalName: '高いが遮蔽のない場所',
    learningLine: 'line.safe_place',
    role: 'falsifying',
    difficulty: 2,
    trigger: { type: 'time', params: { day: 5 } },
    changes: [
      {
        target: 'environment',
        command: 'setZoneHeightCover',
        params: { zone: 'zone.high_open', height: 0.9, cover: 0.1 },
      },
    ],
    cues: [
      { channel: 'direct', phenomenon: 'phenomenon.ears_orienting', condition: 'inRoom' },
      { channel: 'indirect', phenomenon: 'phenomenon.shed_fur', guaranteedInSpiral: true },
    ],
    termination: { type: 'duration', params: { segments: 1 } },
  },
];

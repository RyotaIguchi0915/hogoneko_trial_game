/**
 * サンプル環境コンテンツ（実データ / B10・B11）
 *
 * ⚠️ MVP の最小コンテンツ（1部屋・3ゾーン・3家具）。実コンテンツ・監修は Content 工程。
 * ⚠️ 生データ（unknown 相当）として持ち、ContentRegistry のスキーマ検証を通す（B11 D-2）。
 *    表示名は labelKey（ローカライズキー）で持ち、テキストは埋め込まない（B11 §4）。
 */

/** 家具定義（物理寄与のみ・効果値を持たない・AA-65）。 */
export const FURNITURE_CONTENT: readonly unknown[] = [
  {
    id: 'furniture.cat_tower',
    category: 'structural',
    labelKey: 'furniture.cat_tower.name',
    contributions: [
      { attribute: 'height', delta: 0.6 },
      { attribute: 'cover', delta: 0.2 },
      { attribute: 'sightline', delta: 0.4 },
      { attribute: 'exits', delta: 1 },
    ],
  },
  {
    id: 'furniture.hiding_box',
    category: 'structural',
    labelKey: 'furniture.hiding_box.name',
    contributions: [
      { attribute: 'cover', delta: 0.7 },
      { attribute: 'exits', delta: 1 },
      { attribute: 'humanDistance', delta: 0.2 },
    ],
  },
  {
    id: 'furniture.cushion',
    category: 'comfort',
    labelKey: 'furniture.cushion.name',
    contributions: [
      { attribute: 'softness', delta: 0.7 },
      { attribute: 'cover', delta: 0.1 },
    ],
  },
];

/** 1部屋（3ゾーン）。既定 Zone は隠れ場所（refuge）＝到着直後の猫の居場所（暫定）。 */
export const ROOM_CONTENT: readonly unknown[] = [
  {
    id: 'room.living',
    defaultZoneId: 'zone.refuge',
    zones: [
      {
        id: 'zone.open_floor',
        type: 'open',
        base: {
          height: 0,
          cover: 0.1,
          exits: 2,
          sightline: 0.8,
          humanDistance: 0.2,
          trafficLevel: 0.7,
          noiseLevel: 0.5,
          lightLevel: 0.7,
          temperature: 0.5,
          softness: 0,
        },
        selfScent: 0.1,
        furniture: ['furniture.cushion'],
      },
      {
        // ⚠️ 素のゾーン（EP-4.04）: 家具は据え置かず、プレイヤーが「高い台を置く」で装備する。
        //    高所好きの子はここが整うと落ち着く（＝環境を用意して待つ・docs/09）。
        id: 'zone.vantage',
        type: 'vantage',
        base: {
          height: 0.3,
          cover: 0.1,
          exits: 1,
          sightline: 0.6,
          humanDistance: 0.5,
          trafficLevel: 0.3,
          noiseLevel: 0.4,
          lightLevel: 0.8,
          temperature: 0.6,
          softness: 0,
        },
        selfScent: 0.2,
        furniture: [],
      },
      {
        // ⚠️ 素のゾーン（EP-4.04）: 家具は据え置かず、プレイヤーが「隠れ家を置く」で装備する。
        //    遮蔽好きの子はここが整うと落ち着く（＝環境を用意して待つ・docs/09）。
        id: 'zone.refuge',
        type: 'refuge',
        base: {
          height: 0,
          cover: 0.3,
          exits: 1,
          sightline: 0.2,
          humanDistance: 0.6,
          trafficLevel: 0.1,
          noiseLevel: 0.2,
          lightLevel: 0.3,
          temperature: 0.5,
          softness: 0,
        },
        selfScent: 0.4,
        furniture: [],
      },
    ],
  },
];

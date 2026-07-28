import type { RoomDef, FurnitureDef, ZoneDef } from '@data/schemas/environment';
import type { CatEnvironmentInput } from '../segmentUpdate';
import { computeZoneAttributes, computeZoneSecurity, computeZoneComfort } from './zone';

/**
 * Environment System — 部屋の Zone から環境入力を導出する（L2 Simulation / B10）
 *
 * 家具寄与を加算して Zone 属性を求め、ZoneSecurity / ZoneComfort を**導出**する（保存しない・AA-31）。
 * 猫の内部状態更新（B5 §8.1 step3/11）へ渡す CatEnvironmentInput を提供する。
 *
 * ⚠️ 定義は不変。EnvironmentSystem は読み取り専用の導出器（家具の追加/移動は Command で別途・EP-2.08）。
 * ⚠️ 「どの Zone を環境入力にするか」は本来 Cat の現在地（EP-2.02）に依る。MVP では
 *    RoomDef.defaultZoneId を代表 Zone とする（暫定）。
 */
export interface ZoneEnvironment {
  readonly zoneId: string;
  /** Zone 型（refuge/rest/vantage/resource/open/boundary・B10 §2.5）。ゾーン選択の適合判定に使う。 */
  readonly type: string;
  readonly security: number;
  readonly comfort: number;
}

export class EnvironmentSystem {
  readonly #room: RoomDef;
  readonly #zoneById: ReadonlyMap<string, ZoneDef>;
  readonly #furnitureById: ReadonlyMap<string, FurnitureDef>;

  /**
   * @throws defaultZoneId が存在しない / 参照家具が未定義（参照整合性・B4 §9.5 相当）
   */
  constructor(room: RoomDef, furniture: ReadonlyMap<string, FurnitureDef>) {
    this.#room = room;
    this.#furnitureById = furniture;
    this.#zoneById = new Map(room.zones.map((z) => [z.id, z]));

    if (!this.#zoneById.has(room.defaultZoneId)) {
      throw new Error(
        `EnvironmentSystem: defaultZoneId "${room.defaultZoneId}" not found in room "${room.id}"`,
      );
    }
    for (const zone of room.zones) {
      for (const fid of zone.furniture) {
        if (!furniture.has(fid)) {
          throw new Error(
            `EnvironmentSystem: furniture "${fid}" (zone "${zone.id}") is not defined`,
          );
        }
      }
    }
  }

  /** 指定 Zone の導出環境（安全度・快適度）。 */
  environmentFor(zoneId: string): ZoneEnvironment {
    const zone = this.#zoneById.get(zoneId);
    if (!zone) throw new Error(`EnvironmentSystem: unknown zone "${zoneId}"`);
    const placed = zone.furniture
      .map((fid) => this.#furnitureById.get(fid))
      .filter((f): f is FurnitureDef => f !== undefined);
    const attrs = computeZoneAttributes(zone.base, placed);
    return {
      zoneId,
      type: zone.type,
      security: computeZoneSecurity(attrs, zone.selfScent),
      comfort: computeZoneComfort(attrs, zone.selfScent),
    };
  }

  /** 猫の代表 Zone（既定）の環境。Cat の内部状態更新へ渡す（B5 §8.1）。 */
  defaultEnvironment(): CatEnvironmentInput {
    const env = this.environmentFor(this.#room.defaultZoneId);
    return { zoneSecurity: env.security, zoneComfort: env.comfort };
  }

  /** 全 Zone の導出環境（ゾーン選択の候補・EP-3.02）。 */
  allZones(): readonly ZoneEnvironment[] {
    return this.#room.zones.map((z) => this.environmentFor(z.id));
  }

  /** 既定 Zone（到着直後の居場所）。 */
  defaultZoneId(): string {
    return this.#room.defaultZoneId;
  }

  zoneIds(): readonly string[] {
    return this.#room.zones.map((z) => z.id);
  }
}

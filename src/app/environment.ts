import { ContentRegistryBuilder } from '@data/index';
import {
  furnitureSchema,
  roomSchema,
  type FurnitureDef,
  type RoomDef,
} from '@data/schemas/environment';
import { FURNITURE_CONTENT, ROOM_CONTENT } from '@content/environment';
import { EnvironmentSystem } from '@simulation/index';

/**
 * Environment の組み立て（合成ルート src/app / EP-2.03）
 *
 * サンプル content を ContentRegistry で検証（B11 D-2）してから EnvironmentSystem を構築する。
 * ⚠️ 検証を通らない定義があれば strict で起動を中止する（E-2）。
 * ⚠️ content の読込は層外（合成ルート）の責務。L2 は定義を受け取って計算するだけ。
 */
export function buildDefaultEnvironment(): EnvironmentSystem {
  const { registry } = new ContentRegistryBuilder()
    .add(furnitureSchema, FURNITURE_CONTENT)
    .add(roomSchema, ROOM_CONTENT)
    .build({ strict: true });

  const furniture = new Map<string, FurnitureDef>(
    registry.getAll<FurnitureDef>('furniture').map((f) => [f.id, f]),
  );
  const room = registry.require<RoomDef>('room', 'room.living');
  return new EnvironmentSystem(room, furniture);
}

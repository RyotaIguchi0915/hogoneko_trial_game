import { expect } from 'vitest';
import {
  SaveSystem,
  createMemorySaveStorage,
  createEventBus,
  type GameSnapshot,
} from '@core/index';

/**
 * セーブ往復テストの枠組み（B4 §9.5 / AQ086〜091 / DevConst ⑩）。
 *
 * snapshot を保存 → 復元し、往復で完全一致することを検証する。
 * 新しい Persisted フィールドを増やしたら、この枠を使って往復不変を守る。
 *
 * @returns 復元後の snapshot（後続アサーションに使える）
 */
export function expectSnapshotRoundTrip(snapshot: GameSnapshot, clockValue = 1000): GameSnapshot {
  const bus = createEventBus();
  const system = new SaveSystem(createMemorySaveStorage(), () => clockValue, bus, {
    slotKey: 'roundtrip',
  });

  const write = system.write(snapshot);
  expect(write.ok, 'セーブ書込に失敗').toBe(true);

  const restored = system.read();
  expect(restored.status, '復元が ok にならない').toBe('ok');
  if (restored.status !== 'ok') {
    throw new Error('round trip failed to restore');
  }

  expect(restored.snapshot, 'セーブ往復で状態が一致しない').toEqual(snapshot);
  return restored.snapshot;
}

import { describe, it, expect } from 'vitest';
import { createEventBus } from '@core/events/EventBus';
import { StateStore } from '@core/state/StateStore';
import { getSimulationStateAccess } from '@core/state/simulationAccess';
import { SimulationSystem } from './SimulationSystem';

function makeSystem() {
  const store = new StateStore(createEventBus());
  const system = new SimulationSystem(store);
  const access = getSimulationStateAccess(store);
  return { store, system, access };
}

describe('SimulationSystem（L2・Cat State を L2 限定で駆動）', () => {
  it('updateSegment が Cat State を推移させ、Store に反映する', () => {
    const { system, access } = makeSystem();
    const before = access.getCatState();
    const returned = system.updateSegment({ day: 1, segment: 1, inRoom: true });

    // Store の状態が更新後と一致（applyCatState 経由）
    expect(access.getCatState()).toEqual(returned);
    // 何らかの推移が起きている（hunger 圧が上がる）
    expect(returned.needs.hunger).toBeGreaterThan(before.needs.hunger);
  });

  it('同一初期状態・同一 context なら同一結果（決定論）', () => {
    const a = makeSystem();
    const b = makeSystem();
    const ctx = { day: 2, segment: 3, inRoom: true } as const;
    expect(a.system.updateSegment(ctx)).toEqual(b.system.updateSegment(ctx));
  });

  it('GameModule として id を持つ', () => {
    const { system } = makeSystem();
    expect(system.id).toBe('sim.core');
  });
});

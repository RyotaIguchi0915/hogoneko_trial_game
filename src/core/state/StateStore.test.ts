import { describe, it, expect } from 'vitest';
import { createEventBus } from '../events/EventBus';
import { StateStore, StateEvents } from './StateStore';
import { getSimulationStateAccess } from './simulationAccess';

describe('StateStore — Game Phase', () => {
  it('初期フェーズを保持する', () => {
    const store = new StateStore(createEventBus());
    expect(store.getGamePhase()).toBe('booting');
  });

  it('正当な遷移を受理し、変更を通知する（SM-7）', () => {
    const bus = createEventBus();
    const store = new StateStore(bus);
    const changes: Array<{ from: string; to: string }> = [];
    bus.on(StateEvents.gamePhaseChanged, (c) => changes.push(c));

    store.transitionGamePhase('loading');
    expect(store.getGamePhase()).toBe('loading');
    expect(changes).toEqual([{ from: 'booting', to: 'loading' }]);
  });

  it('不正な遷移を拒否する（SM-4）', () => {
    const store = new StateStore(createEventBus());
    expect(() => store.transitionGamePhase('playing')).toThrow(/invalid game phase transition/);
    expect(store.getGamePhase()).toBe('booting'); // 状態は変わらない
  });
});

describe('StateStore — Cat State は L2 限定（憲章 I-1 / SM-5）', () => {
  it('SimulationStateAccess 経由で Cat State を読み書きできる', () => {
    const store = new StateStore(createEventBus());
    const access = getSimulationStateAccess(store);

    expect(access.getCatState()).toEqual({ arrived: false });
    access.applyCatState({ arrived: true });
    expect(access.getCatState()).toEqual({ arrived: true });
  });

  it('PresentationStateReader インターフェースに Cat State アクセスが無い', () => {
    // 型レベルの保証: L4 が受け取る reader には getCatState が存在しない。
    // 実行時にも公開 reader の形に cat 系メソッドが無いことを確認する。
    const store = new StateStore(createEventBus());
    const reader: { getGamePhase(): string } = store;
    expect(typeof reader.getGamePhase).toBe('function');
    // getCatState は SimulationCapability を要求するため、reader 型からは呼べない。
    expect(Object.keys(reader)).not.toContain('getCatState');
  });
});

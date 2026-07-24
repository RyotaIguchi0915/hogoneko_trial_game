import { describe, it, expect, vi } from 'vitest';
import { createEventBus, defineChannel } from './EventBus';

const ping = defineChannel<number>('test/ping');
const pong = defineChannel<string>('test/pong');

describe('Event Bus', () => {
  it('購読したハンドラにペイロードを配信する', () => {
    const bus = createEventBus();
    const received: number[] = [];
    bus.on(ping, (n) => received.push(n));
    bus.emit(ping, 42);
    expect(received).toEqual([42]);
  });

  it('配信順序が優先度降順 → 登録順で決定論的', () => {
    const bus = createEventBus();
    const order: string[] = [];
    bus.on(ping, () => order.push('a-default'));
    bus.on(ping, () => order.push('b-high'), { priority: 10 });
    bus.on(ping, () => order.push('c-default'));
    bus.on(ping, () => order.push('d-high'), { priority: 10 });
    bus.emit(ping, 1);
    // priority10 が先（登録順 b,d）、その後 default（登録順 a,c）
    expect(order).toEqual(['b-high', 'd-high', 'a-default', 'c-default']);
  });

  it('配信中のネストした emit は再入せず FIFO で後処理される', () => {
    const bus = createEventBus();
    const log: string[] = [];
    bus.on(ping, (n) => {
      log.push(`ping-start:${n}`);
      if (n === 1) bus.emit(pong, 'from-ping'); // 配信中の emit
      log.push(`ping-end:${n}`);
    });
    bus.on(pong, (s) => log.push(`pong:${s}`));
    bus.emit(ping, 1);
    // ping が完全に終わってから pong が処理される（再入しない）
    expect(log).toEqual(['ping-start:1', 'ping-end:1', 'pong:from-ping']);
  });

  it('unsubscribe でハンドラが解除される', () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const sub = bus.on(ping, handler);
    bus.emit(ping, 1);
    sub.unsubscribe();
    bus.emit(ping, 2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('handlerCount で解除漏れを検出できる', () => {
    const bus = createEventBus();
    const sub1 = bus.on(ping, () => {});
    const sub2 = bus.on(ping, () => {});
    expect(bus.handlerCount(ping)).toBe(2);
    sub1.unsubscribe();
    expect(bus.handlerCount(ping)).toBe(1);
    sub2.unsubscribe();
    expect(bus.handlerCount(ping)).toBe(0);
  });

  it('配信中に unsubscribe されても当該配信は安全に完了する', () => {
    const bus = createEventBus();
    const log: string[] = [];
    // second を先に登録してから、優先度で先に走る first が走査中に解除する。
    const sub2 = bus.on(ping, () => log.push('second'));
    bus.on(
      ping,
      () => {
        log.push('first');
        sub2.unsubscribe(); // 走査中に後続を解除
      },
      { priority: 10 },
    );
    bus.emit(ping, 1);
    // スナップショット走査のため second も呼ばれる
    expect(log).toEqual(['first', 'second']);
    // 次回は解除済み
    log.length = 0;
    bus.emit(ping, 2);
    expect(log).toEqual(['first']);
  });
});

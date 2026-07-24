/**
 * Event Bus — 疎結合な同期通信（L1 Core / B4 C-04）
 *
 * 設計要件（B4 §5・AA-27/48/49）:
 *   - 配信順序が決定論的（優先度降順 → 登録順の安定ソート）
 *   - 同期配信中の再入を許容しない（ネストした emit は FIFO で遅延処理）
 *   - 購読解除を提供し、解除漏れを検出できる
 *
 * ⚠️ イベントに Simulation の生データ（数値=Truth）を載せない（B4 C-04 禁止事項）。
 *    L3 以上へ渡してよいのは Phenomenon のみ。
 */

/** 型付きチャネル。ペイロード型を幽霊型で運ぶ（実行時には name のみ） */
export interface EventChannel<TPayload> {
  readonly name: string;
  /** phantom type carrier — 実行時には存在しない */
  readonly __payload?: TPayload;
}

/** 型安全なチャネルを定義する */
export function defineChannel<TPayload>(name: string): EventChannel<TPayload> {
  return { name };
}

export interface Subscription {
  unsubscribe(): void;
}

export interface SubscribeOptions {
  /** 大きいほど先に呼ばれる（同値は登録順・安定） */
  readonly priority?: number;
}

export interface EventBus {
  on<TPayload>(
    channel: EventChannel<TPayload>,
    handler: (payload: TPayload) => void,
    options?: SubscribeOptions,
  ): Subscription;
  emit<TPayload>(channel: EventChannel<TPayload>, payload: TPayload): void;
  /** テスト・診断用: 現在の購読数（解除漏れ検出に使う） */
  handlerCount(channel: EventChannel<unknown>): number;
}

interface Registration {
  readonly handler: (payload: unknown) => void;
  readonly priority: number;
  readonly seq: number;
}

class DeterministicEventBus implements EventBus {
  readonly #registry = new Map<string, Registration[]>();
  #seq = 0;
  #dispatching = false;
  readonly #queue: Array<{ readonly name: string; readonly payload: unknown }> = [];

  on<TPayload>(
    channel: EventChannel<TPayload>,
    handler: (payload: TPayload) => void,
    options?: SubscribeOptions,
  ): Subscription {
    const list = this.#registry.get(channel.name) ?? [];
    const registration: Registration = {
      handler: handler as (payload: unknown) => void,
      priority: options?.priority ?? 0,
      seq: this.#seq++,
    };
    list.push(registration);
    // 優先度降順 → 登録順昇順。安定・決定論的（B4 §5.3）。
    list.sort((a, b) => b.priority - a.priority || a.seq - b.seq);
    this.#registry.set(channel.name, list);

    return {
      unsubscribe: () => {
        const current = this.#registry.get(channel.name);
        if (!current) return;
        const index = current.indexOf(registration);
        if (index >= 0) current.splice(index, 1);
      },
    };
  }

  emit<TPayload>(channel: EventChannel<TPayload>, payload: TPayload): void {
    this.#queue.push({ name: channel.name, payload });

    // 再入防止（AA-27/49）: 配信中の emit はキューへ積み、現在の配信後に処理する。
    if (this.#dispatching) return;

    this.#dispatching = true;
    try {
      while (this.#queue.length > 0) {
        const item = this.#queue.shift();
        if (!item) break;
        const list = this.#registry.get(item.name);
        if (!list) continue;
        // 配信中の unsubscribe に対して安全なようスナップショットを走査する。
        for (const registration of [...list]) {
          registration.handler(item.payload);
        }
      }
    } finally {
      this.#dispatching = false;
    }
  }

  handlerCount(channel: EventChannel<unknown>): number {
    return this.#registry.get(channel.name)?.length ?? 0;
  }
}

/** Event Bus を生成する */
export function createEventBus(): EventBus {
  return new DeterministicEventBus();
}

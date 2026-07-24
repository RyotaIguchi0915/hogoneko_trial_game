import type { GameModule } from '../module/GameModule';
import { defineChannel, type EventBus } from '../events/EventBus';
import {
  advanceSegment,
  initialTime,
  DEFAULT_TRIAL_CONFIG,
  type TimeState,
  type TrialConfig,
} from './TimeState';

/**
 * Time System — 時間の Imperative Shell（L1 Core / B4 C-02）
 *
 * 現在時刻を単一で保持し、粒度の進行をイベントで通知する。
 * ⚠️ 巻き戻し API を持たない（Pillar 4）。実時間と連動しない（AP-17）。
 * ⚠️ 各層が独自に時間を数えることを許さない（時間の単一情報源）。
 */

export const TimeEvents = {
  segmentAdvanced: defineChannel<TimeState>('time/segmentAdvanced'),
  dayAdvanced: defineChannel<TimeState>('time/dayAdvanced'),
  trialEnded: defineChannel<TimeState>('time/trialEnded'),
} as const;

export class TimeSystem implements GameModule {
  readonly id = 'core.time';

  readonly #bus: EventBus;
  readonly #config: TrialConfig;
  #state: TimeState;

  /**
   * @param initialState セーブからの再構築用（B4 §9）。復元は「巻き戻し」ではなく起動時の再構築（Pillar 4）。
   */
  constructor(
    bus: EventBus,
    config: TrialConfig = DEFAULT_TRIAL_CONFIG,
    initialState: TimeState = initialTime(),
  ) {
    this.#bus = bus;
    this.#config = config;
    this.#state = initialState;
  }

  /** 現在時刻（読み取り専用） */
  now(): TimeState {
    return this.#state;
  }

  /** 1 Segment 進め、対応するイベントを発行する */
  advanceSegment(): TimeState {
    const result = advanceSegment(this.#state, this.#config);
    this.#state = result.state;

    this.#bus.emit(TimeEvents.segmentAdvanced, this.#state);
    if (result.crossedDay) {
      this.#bus.emit(TimeEvents.dayAdvanced, this.#state);
    }
    if (result.endedTrial) {
      this.#bus.emit(TimeEvents.trialEnded, this.#state);
    }
    return this.#state;
  }
}

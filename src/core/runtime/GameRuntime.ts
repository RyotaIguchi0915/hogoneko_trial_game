import { GameManager } from '../module/GameManager';
import { createEventBus, type EventBus } from '../events/EventBus';
import { createRng, restoreRng, type Rng } from '../rng';
import { TimeSystem } from '../time/TimeSystem';
import {
  initialTime,
  DEFAULT_TRIAL_CONFIG,
  type TimeState,
  type TrialConfig,
} from '../time/TimeState';
import { StateStore } from '../state/StateStore';
import { initialCatState } from '../state/catState';
import type { GamePhase } from '../state/gamePhase';
import { getSimulationStateAccess, type SimulationStateAccess } from '../state/simulationAccess';
import { SaveSystem, type Clock, type RestoreStatus, type SaveResult } from '../save/SaveSystem';
import type { SaveStorage } from '../save/SaveStorage';
import type { GameSnapshot } from '../save/SaveData';

/**
 * Game Runtime — 5層貫通の合成ルート（L1 Core / EP-14 の中核）
 *
 * 「何を組み立て、セーブから何を再構築するか」を一箇所に集約する。
 * ⚠️ Cat State の捕捉/復元は simulationAccess（L2 権限）を Core 内部でのみ使う。
 *    L4 は本 Runtime を不透明ハンドルとして扱い、Cat State には決して触れられない（憲章 I-1）。
 * ⚠️ セーブからの復元は「再構築」であって「巻き戻し」ではない（Pillar 4）。
 *    したがって起動時にのみシステムを snapshot から生成する。
 */

/** L4 に安全な読み取り面。Cat State（真実）を含まない。 */
export interface RuntimeReader {
  getGamePhase(): GamePhase;
  /** 全体進行（day/segment/phase）。グローバルで L4 に開示可（Cat State ではない）。 */
  getProgress(): TimeState;
  /** 起動時の復元経路（診断・静かな通知用）。 */
  getRestoreStatus(): RestoreStatus;
}

export interface GameRuntimeDeps {
  readonly storage: SaveStorage;
  /** 壁時計。L4 が Date.now を注入する。 */
  readonly clock: Clock;
  /** 新規開始時のシード（復元時は保存済みシードを優先）。 */
  readonly seed: number;
  readonly config?: TrialConfig;
  readonly buildVersion?: string;
}

export class GameRuntime {
  readonly #manager: GameManager;
  readonly #bus: EventBus;
  readonly #time: TimeSystem;
  readonly #store: StateStore;
  readonly #catAccess: SimulationStateAccess;
  readonly #save: SaveSystem;
  #rng: Rng;
  #seed: number;
  readonly #restoreStatus: RestoreStatus;

  private constructor(deps: GameRuntimeDeps) {
    const config = deps.config ?? DEFAULT_TRIAL_CONFIG;
    this.#bus = createEventBus();
    this.#save = new SaveSystem(deps.storage, deps.clock, this.#bus, {
      buildVersion: deps.buildVersion ?? '0.0.0',
    });

    // セーブを読み、あれば再構築・無ければ新規（B4 §3 起動フロー）。
    const restore = this.#save.read();
    const snapshot: GameSnapshot | null =
      restore.status === 'ok' || restore.status === 'recovered' ? restore.snapshot : null;
    this.#restoreStatus = restore.status;

    if (snapshot) {
      this.#seed = snapshot.determinism.seed;
      this.#rng = restoreRng(snapshot.determinism.seed, snapshot.determinism.streamState);
      this.#time = new TimeSystem(this.#bus, config, snapshot.progress);
      this.#store = new StateStore(this.#bus, snapshot.gamePhase, snapshot.simulation.cat);
    } else {
      this.#seed = deps.seed;
      this.#rng = createRng(deps.seed);
      this.#time = new TimeSystem(this.#bus, config, initialTime());
      this.#store = new StateStore(this.#bus, 'booting', initialCatState());
    }

    this.#catAccess = getSimulationStateAccess(this.#store);

    this.#manager = new GameManager();
    this.#manager.register(this.#time).register(this.#save);
  }

  /** Runtime を生成し、セーブがあれば復元した状態で初期化する。 */
  static create(deps: GameRuntimeDeps): GameRuntime {
    const rt = new GameRuntime(deps);
    rt.#manager.init();
    return rt;
  }

  get bus(): EventBus {
    return this.#bus;
  }

  get reader(): RuntimeReader {
    return {
      getGamePhase: () => this.#store.getGamePhase(),
      getProgress: () => this.#time.now(),
      getRestoreStatus: () => this.#restoreStatus,
    };
  }

  /** 現在の元データを捕捉する（派生値は含めない・B4 §9.2）。 */
  #capture(): GameSnapshot {
    return {
      determinism: { seed: this.#seed, streamState: this.#rng.state },
      progress: this.#time.now(),
      gamePhase: this.#store.getGamePhase(),
      simulation: { cat: this.#catAccess.getCatState() },
    };
  }

  /** 1 Segment 進める（副作用: TimeEvents 発行）。保存は呼び出し側が明示する。 */
  advanceSegment(): TimeState {
    return this.#time.advanceSegment();
  }

  /** 現在状態を保存する（自動保存の実体）。失敗は結果で返る（AA-75）。 */
  save(): SaveResult {
    return this.#save.write(this.#capture());
  }

  /** ライフサイクル終了。 */
  dispose(): void {
    this.#manager.dispose();
  }
}

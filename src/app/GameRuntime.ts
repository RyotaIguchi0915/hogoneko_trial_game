import {
  GameManager,
  createEventBus,
  createRng,
  restoreRng,
  TimeSystem,
  initialTime,
  isInRoomSegment,
  DEFAULT_TRIAL_CONFIG,
  StateStore,
  SaveSystem,
  type EventBus,
  type Rng,
  type TimeState,
  type TrialConfig,
  type GamePhase,
  type Clock,
  type RestoreStatus,
  type SaveResult,
  type SaveStorage,
  type GameSnapshot,
  type TruthReader,
} from '@core/index';
import { initialCatState } from '@core/state/catState';
import { getSimulationStateAccess, type SimulationStateAccess } from '@core/state/simulationAccess';
import { SimulationSystem, type EnvironmentSystem } from '@simulation/index';
import { toPhenomena, type Phenomenon } from '@perception/index';
import { buildDefaultEnvironment } from './environment';

/**
 * Game Runtime — 5層貫通の合成ルート（合成層 src/app / EP-14・EP-2.05）
 *
 * 「何を組み立て、セーブから何を再構築し、1 Segment で何を駆動するか」を一箇所に集約する。
 *
 * ⚠️ 本モジュールは層（L0〜L4）に属さない**合成ルート**である。ゆえに L1 Core と L2 Simulation の
 *    双方を import できる（L1 core は L2 を import できないため、L2 の駆動は層外で行う・EP-2.05）。
 * ⚠️ Cat State の捕捉/駆動は simulationAccess / SimulationSystem（L2 権限）に閉じる。
 *    L4 は本 Runtime を不透明ハンドルとして扱い、Cat State には決して触れられない（憲章 I-1）。
 * ⚠️ セーブからの復元は「再構築」であって「巻き戻し」ではない（Pillar 4）。
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
  readonly #sim: SimulationSystem;
  readonly #env: EnvironmentSystem;
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
    this.#sim = new SimulationSystem(this.#store);
    this.#env = buildDefaultEnvironment();

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

  /** 真実（Cat State を含む）の読み取り専用リーダ（開発ビルド限定・B4 §11.5 / EP-12）。 */
  createTruthReader(): TruthReader {
    return {
      getGamePhase: () => this.#store.getGamePhase(),
      getProgress: () => this.#time.now(),
      getCatState: () => this.#catAccess.getCatState(),
      getRngState: () => this.#rng.state,
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

  /**
   * 1 Segment 進める。時間を進めた上で、その Segment 分の猫の真実を推移させる（B5 §8.1）。
   * 在室 Segment（B2 §3.2: SG-2/4/5 = index 1/3/4）は直接観測の対象、不在は痕跡（EP-2.06）。
   * ⚠️ トライアル終了後（phase='ended'）は Simulation を回さない（AP-08）。
   */
  advanceSegment(): TimeState {
    const state = this.#time.advanceSegment();
    if (state.phase === 'running') {
      this.#sim.updateSegment({
        day: state.day,
        segment: state.segment,
        inRoom: isInRoomSegment(state.segment),
        environment: this.#env.defaultEnvironment(),
        // 行動選択の揺らぎは用途別ストリームで（B5 §8.4）。root を消費せず fork（保存位置に非依存・決定論）。
        behaviorRng: this.#rng.fork('behavior', state.day, state.segment),
      });
    }
    return state;
  }

  /**
   * 現在の観測結果（Phenomenon）を返す（EP-2.04・観測境界の越境点）。
   * 合成ルートが L2 権限で真実を読み、Perception Gateway で数値を持たない現象へ変換する。
   * L4 は本メソッドの戻り値（Phenomenon のみ）を受け取り、Cat State には触れられない（憲章 I-1）。
   */
  observe(observing = true): readonly Phenomenon[] {
    const segment = this.#time.now().segment;
    return toPhenomena(this.#catAccess.getCatState(), {
      inRoom: isInRoomSegment(segment),
      observing,
    });
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

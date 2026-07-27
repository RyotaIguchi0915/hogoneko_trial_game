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
  appendObservations,
  type ObservationEntry,
  appendTraces,
  type Trace,
} from '@core/index';
import { initialCatState } from '@core/state/catState';
import { getSimulationStateAccess, type SimulationStateAccess } from '@core/state/simulationAccess';
import {
  SimulationSystem,
  feedCat,
  traceForBehavior,
  dueEvents,
  environmentEffect,
  combineDelta,
  clamp01,
  type EnvironmentDelta,
  type EnvironmentSystem,
} from '@simulation/index';
import type { EventDef } from '@data/schemas/event';
import { toPhenomena, tracesToPhenomena, type Phenomenon } from '@perception/index';
import { buildDefaultEnvironment } from './environment';
import { buildEventContent } from './events';

/** 在室 Segment ごとの行動枠（B2 §4 / B9 §3.3）。観察=0/介入=有限の非対称。 */
const SLOTS_PER_IN_ROOM_SEGMENT = 2;

/** 介入の結果。失敗理由を返す（UI が静かに提示）。 */
export type InterventionResult =
  | { readonly ok: true; readonly slotsLeft: number }
  | { readonly ok: false; readonly reason: 'away' | 'no-slots' };

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
  /** 現 Segment に残る行動枠（B2 §4）。不在 Segment では 0。 */
  getActionSlots(): number;
  /**
   * 観察履歴（Player Knowledge の再生成元・G-2）。Phenomenon 由来の記録のみで、数値・Cat State を含まない。
   * ⚠️ 返すのは「記録された事実」であって解釈ではない。理解の再生成は L3 Player Knowledge が担う。
   */
  getObservationLog(): readonly ObservationEntry[];
  /**
   * 現 Segment の観測スナップショット（描画用・EP-2.06）。在室なら猫の様子＋発見した痕跡、不在なら out_of_sight。
   * ⚠️ pending 痕跡のクリアに影響されない安定スナップショット。数値を含まない（Phenomenon のみ・I-1）。
   */
  getObservation(): readonly Phenomenon[];
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
  /** 現 Segment の残り行動枠（transient・保存しない・B4 §9.2）。 */
  #actionSlots: number;
  /** 観察履歴（Persisted・追記のみ・B4 §9.2）。復元元があれば引き継ぐ。 */
  #observationLog: readonly ObservationEntry[];
  /** 未発見の痕跡（Persisted・不在 Segment で累積、在室で発見して観察履歴へ移す・EP-2.06）。 */
  #pendingTraces: readonly Trace[];
  /** 現 Segment の観測スナップショット（transient・描画用。pending クリアに影響されない）。 */
  #lastObservation: readonly Phenomenon[];
  /** 検証済みイベント定義（不変・content 由来）。 */
  readonly #events: readonly EventDef[];
  /** 発火済みイベントID（Persisted・一度だけ発火・EP-2.09）。 */
  readonly #firedEventIds: Set<string>;
  /** 発火が累積した環境調整（Persisted・代表 Zone の security/comfort への加算・EP-2.09）。 */
  #envAdjust: EnvironmentDelta;

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
      // 旧セーブに observationLog / traces / 発火状態 が無ければ既定で補完（B4 §9.6 フィールド追加）。
      this.#observationLog = snapshot.observationLog ?? [];
      this.#pendingTraces = snapshot.traces ?? [];
      this.#firedEventIds = new Set(snapshot.firedEventIds ?? []);
      this.#envAdjust = snapshot.envAdjust ?? { security: 0, comfort: 0 };
    } else {
      this.#seed = deps.seed;
      this.#rng = createRng(deps.seed);
      this.#time = new TimeSystem(this.#bus, config, initialTime());
      this.#store = new StateStore(this.#bus, 'booting', initialCatState());
      this.#observationLog = [];
      this.#pendingTraces = [];
      this.#firedEventIds = new Set();
      this.#envAdjust = { security: 0, comfort: 0 };
    }

    this.#catAccess = getSimulationStateAccess(this.#store);
    this.#sim = new SimulationSystem(this.#store);
    this.#env = buildDefaultEnvironment();
    this.#events = buildEventContent();
    this.#actionSlots = this.#slotsForSegment(this.#time.now().segment);
    // 初期表示スナップショット（履歴へは追記しない・リロードで重複させない）。
    this.#lastObservation = this.#observeCurrent();

    this.#manager = new GameManager();
    this.#manager.register(this.#time).register(this.#save);
  }

  /** その Segment の行動枠数（在室なら 2、不在は 0）。 */
  #slotsForSegment(segment: number): number {
    return isInRoomSegment(segment) ? SLOTS_PER_IN_ROOM_SEGMENT : 0;
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
      getActionSlots: () => this.#actionSlots,
      getObservationLog: () => this.#observationLog,
      getObservation: () => this.#lastObservation,
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
      observationLog: this.#observationLog,
      traces: this.#pendingTraces,
      firedEventIds: [...this.#firedEventIds],
      envAdjust: this.#envAdjust,
    };
  }

  /**
   * 現 Day に達したイベントを発火し、環境調整を累積する（EP-2.09 発火 runtime）。
   * ⚠️ 猫の内部状態は変えない（StateChange.target が環境・資源のみ・§2.3）。発火後の反応は Cat AI に委ねる。
   *    一度だけ発火（firedEventIds）。効果量は仮値・監修待ち（environmentEffect）。
   */
  #fireDueEvents(day: number): void {
    for (const e of dueEvents(this.#events, day, this.#firedEventIds)) {
      for (const change of e.changes) {
        this.#envAdjust = combineDelta(this.#envAdjust, environmentEffect(change));
      }
      this.#firedEventIds.add(e.id);
    }
  }

  /** 発火の累積を反映した、現在の代表 Zone 環境（基準 env に調整を加えてクランプ）。 */
  #currentEnvironment(): { readonly zoneSecurity: number; readonly zoneComfort: number } {
    const base = this.#env.defaultEnvironment();
    return {
      zoneSecurity: clamp01(base.zoneSecurity + this.#envAdjust.security),
      zoneComfort: clamp01(base.zoneComfort + this.#envAdjust.comfort),
    };
  }

  /**
   * 現 Segment のライブ観測（在室=猫の様子＋発見した痕跡 / 不在=out_of_sight）。純粋な読み取り。
   * ⚠️ 不在中は「自分がいない」ので痕跡は見えない。痕跡は在室で戻った時に**発見**される（B2 §3.2）。
   */
  #observeCurrent(): readonly Phenomenon[] {
    const inRoom = isInRoomSegment(this.#time.now().segment);
    const catPhenomena = toPhenomena(this.#catAccess.getCatState(), { inRoom, observing: true });
    const tracePhenomena = inRoom ? tracesToPhenomena(this.#pendingTraces) : [];
    return [...catPhenomena, ...tracePhenomena];
  }

  /**
   * その Segment の観測をスナップショットし、履歴へ一度だけ追記する（Phenomenon → 素の記録・追記のみ）。
   * ⚠️ Segment 進行時に一度だけ呼ぶ（描画のたびに呼ばない）。再描画/リロードで重複追記しないため、
   *    ここでのみ蓄積する（G-2: 保存するのは履歴だけ）。#lastObservation は pending クリアの影響を受けない。
   */
  #recordObservation(state: TimeState): void {
    this.#lastObservation = this.#observeCurrent();
    const entries: readonly ObservationEntry[] = this.#lastObservation.map((p) => ({
      day: state.day,
      segment: state.segment,
      subject: p.subject,
      descriptor: p.descriptor,
    }));
    this.#observationLog = appendObservations(this.#observationLog, entries);
    // 在室で観測したら pending 痕跡は「発見済み」→ クリア（次の不在期間と混ざらない・重複記録しない）。
    if (isInRoomSegment(state.segment)) {
      this.#pendingTraces = [];
    }
  }

  /**
   * 1 Segment 進める。時間を進めた上で、その Segment 分の猫の真実を推移させる（B5 §8.1）。
   * 在室 Segment（B2 §3.2: SG-2/4/5 = index 1/3/4）は直接観測の対象、不在は痕跡（EP-2.06）。
   * ⚠️ トライアル終了後（phase='ended'）は Simulation を回さない（AP-08）。
   */
  advanceSegment(): TimeState {
    const state = this.#time.advanceSegment();
    if (state.phase === 'running') {
      // 推移の前に、その Day に達したイベントを発火して環境を変える（世界の変化・§2.3）。
      // 猫はこの変わった環境に対して自律的に反応する（下の updateSegment で Cat AI が決める）。
      this.#fireDueEvents(state.day);
      this.#sim.updateSegment({
        day: state.day,
        segment: state.segment,
        inRoom: isInRoomSegment(state.segment),
        environment: this.#currentEnvironment(),
        // 行動選択の揺らぎは用途別ストリームで（B5 §8.4）。root を消費せず fork（保存位置に非依存・決定論）。
        behaviorRng: this.#rng.fork('behavior', state.day, state.segment),
      });
      // 不在 Segment: 猫が「見ていない間」に残した痕跡を生成し累積（在室で発見される・EP-2.06）。
      //   決定論的（行動→種別の純粋写像）。痕跡を残さない行動もある（hiding/alert）。
      if (!isInRoomSegment(state.segment)) {
        const kind = traceForBehavior(this.#catAccess.getCatState().behavior);
        if (kind) this.#pendingTraces = appendTraces(this.#pendingTraces, [{ kind }]);
      }
      // 推移後の Segment を観測し、履歴へ一度だけ追記（Player Knowledge の再生成元・G-2）。
      this.#recordObservation(state);
    }
    // トライアル終了（30日消化）で去就の決定フェーズへ（playing のときのみ・EP-3.01 物語アーク）。
    if (state.phase === 'ended' && this.#store.getGamePhase() === 'playing') {
      this.#store.transitionGamePhase('deciding');
    }
    // 行動枠を新 Segment 分にリセット（未使用枠は繰り越さない・B2 §4）。
    this.#actionSlots = this.#slotsForSegment(state.segment);
    return state;
  }

  /**
   * トライアルを開始する（booting→playing・EP-3.01 物語アークの入口）。
   * title/preparing は内部遷移（実画面・オンボーディングは OI-4）。既に開始済みなら何もしない（冪等）。
   */
  begin(): void {
    if (this.#store.getGamePhase() !== 'booting') return;
    for (const to of ['loading', 'title', 'preparing', 'playing'] as const) {
      this.#store.transitionGamePhase(to);
    }
  }

  /**
   * 結末アークを1段進める（deciding→ending→epilogue→reflection・EP-3.01）。UI の確認操作から呼ぶ。
   * ⚠️ 去就の決定の中身・結末の意味づけ・演出は監修/OI-4（ここは遷移の機構のみ・プレースホルダ）。
   * 進行不能なフェーズでは何もしない（現フェーズを返す）。
   */
  advancePhase(): GamePhase {
    const next: Partial<Record<GamePhase, GamePhase>> = {
      deciding: 'ending',
      ending: 'epilogue',
      epilogue: 'reflection',
    };
    const to = next[this.#store.getGamePhase()];
    if (to) this.#store.transitionGamePhase(to);
    return this.#store.getGamePhase();
  }

  /**
   * 餌をやる（介入・B2 §4 / B9 §3.4）。行動枠を1消費し、猫の空腹を和らげる。
   * ⚠️ 猫を操作するのではなく、環境（資源）への働きかけの結果として状態が変わる（憲章 I-2）。
   *    Cat State は直接書き換えず、L2 権限（simulationAccess）＋純粋関数 feedCat 経由で更新する。
   * 在室 Segment で枠がある時のみ成功。観察は無制限・介入は有限の非対称（B2 §4）。
   */
  feed(): InterventionResult {
    if (!isInRoomSegment(this.#time.now().segment)) return { ok: false, reason: 'away' };
    if (this.#actionSlots <= 0) return { ok: false, reason: 'no-slots' };
    this.#catAccess.applyCatState(feedCat(this.#catAccess.getCatState()));
    this.#actionSlots -= 1;
    return { ok: true, slotsLeft: this.#actionSlots };
  }

  /**
   * 現在の観測結果（Phenomenon）を返す（EP-2.04・観測境界の越境点）。
   * 合成ルートが L2 権限で真実を読み、Perception Gateway で数値を持たない現象へ変換する。
   * L4 は本メソッドの戻り値（Phenomenon のみ）を受け取り、Cat State には触れられない（憲章 I-1）。
   */
  observe(observing = true): readonly Phenomenon[] {
    if (!observing) return []; // P-03: 見ていない対象の情報は返さない
    return this.#observeCurrent();
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

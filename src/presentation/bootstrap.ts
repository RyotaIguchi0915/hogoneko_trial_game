import { DEFAULT_TRIAL_CONFIG, type SaveStorage, type Clock, type TrialConfig } from '@core/index';
import { Localization } from '@data/index';
import { GameRuntime } from '@app/index';
import { LOCALES } from '@content/locales';
import { derivePlayerKnowledge, resolvedDescriptor, deriveInsights } from '@perception/index';
import { spriteForDescriptor } from './sprites';
import type { AppView } from './appView';

/**
 * Bootstrap — 起動配線と表示モデルの算出（EP-14 / EP-2.10）。
 *
 * ブラウザ固有依存（storage/clock/seed）は呼び出し側（main.tsx）が渡す。
 * ⚠️ この層は L2 を**直接** import しない。合成ルート（src/app）越しに不透明ハンドルを受け取り、
 *    受け取るのは Phenomenon 由来の文字列・進行・行動枠のみ（憲章 I-1・Cat State には到達しない）。
 * ⚠️ Segment の進行はプレイヤー操作（App の「次へ」）に委ねる。起動時に勝手に進めない（B2 §3 在室=確定）。
 */
export interface BootstrapDeps {
  readonly storage: SaveStorage;
  readonly clock: Clock;
  readonly seed: number;
  readonly buildVersion?: string;
  /** トライアル構成（省略時は本編30日）。デモは DEMO_TRIAL_CONFIG を渡す（EP-3.09）。 */
  readonly config?: TrialConfig;
}

export interface BootstrapResult {
  readonly runtime: GameRuntime;
  readonly view: AppView;
}

const localization = new Localization(LOCALES, 'ja');

/**
 * ランタイムの現在状態から表示モデル（AppView）を算出する。
 * bootstrap の初期表示と、App の操作後の再描画の双方で使う（数値は載せない・I-1）。
 */
export function computeView(
  runtime: GameRuntime,
  restoreStatus: AppView['restoreStatus'],
): AppView {
  // 現 Segment の安定スナップショット（在室で戻った時は痕跡も含む・pending クリアの影響を受けない・EP-2.06）。
  const phenomena = runtime.reader.getObservation();
  // 立てた仮説に応じて観察文の解像度が上がる（EP-4.03・docs/06:681「唯一の支援」）。
  // ⚠️ 正誤の合図ではない——**外れた仮説でも詳しくなる**。詳しい版の語彙が無ければ元の語に倒す。
  const formed = runtime.reader.getHypotheses();
  // 答え合わせ（EP-4.05）: 立てた仮説が観察とどう噛み合っているか。
  // ⚠️ Insight は L4 に渡さない（数値・確信度を出さない・I-1）。効くのは下の解像度だけ。
  //    反証が優勢になった仮説は解像度が静かに戻る——通知も警告も出さない（責めない・docs/06:1291）。
  const observationLog = runtime.reader.getObservationLog();
  const insights = deriveInsights(observationLog);
  const describe = (descriptor: string): string => {
    const key = resolvedDescriptor(descriptor, formed, insights);
    return localization.has(key) ? localization.resolve(key) : localization.resolve(descriptor);
  };
  const observations = phenomena.map((p) => describe(p.descriptor));
  // スプライトは猫の様子（subject:'cat'）から。音・痕跡は文字（観察）で示し、猫の姿勢は変えない（EP-4.02）。
  const catPhenomenon = phenomena.find((p) => p.subject === 'cat');
  const catSprite = spriteForDescriptor(catPhenomenon?.descriptor);
  // 猫の居場所（EP-4.02b）。観察文とまったく同じ Phenomenon から取るので、文と絵が食い違わない。
  const catPlace = phenomena.find((p) => p.subject === 'place')?.descriptor ?? null;
  const progress = runtime.reader.getProgress();
  // Player Knowledge を観察履歴から再生成（保存しない・G-2）。回数は「観測回数」で Cat State ではない（I-1）。
  const knowledge = derivePlayerKnowledge(observationLog);
  const knowledgeNotes = knowledge.observed.map(
    (o) => `${localization.resolve(o.descriptor)}${o.count > 1 ? ` ×${o.count}` : ''}`,
  );
  // 仮説帳（EP-4.03）: いま立てられる候補（＝観測済みの現象に基づくものだけ）に、立てている印を添える。
  const formedSet = new Set(formed);
  const hypotheses = runtime.reader.getAvailableHypotheses().map((id) => ({
    id,
    label: localization.resolve(id),
    formed: formedSet.has(id),
  }));
  return {
    restoreStatus,
    day: progress.day,
    segment: progress.segment,
    segmentsPerDay: DEFAULT_TRIAL_CONFIG.segmentsPerDay,
    phase: progress.phase,
    gamePhase: runtime.reader.getGamePhase(),
    decision: runtime.reader.getDecision(),
    bondTier: runtime.reader.getBondTier(),
    observations,
    catSprite,
    catPlace,
    actionSlots: runtime.reader.getActionSlots(),
    placements: runtime.reader.getPlacements(),
    hypotheses,
    knowledgeNotes,
  };
}

export function bootstrap(deps: BootstrapDeps): BootstrapResult {
  const runtime = GameRuntime.create({
    storage: deps.storage,
    clock: deps.clock,
    seed: deps.seed,
    ...(deps.buildVersion !== undefined ? { buildVersion: deps.buildVersion } : {}),
    ...(deps.config !== undefined ? { config: deps.config } : {}),
  });
  const restoreStatus = runtime.reader.getRestoreStatus();
  // 新規プレイはタイトル画面から（booting→title・EP-3.10）。復元は保存フェーズを維持（title を挟まない）。
  runtime.showTitle();
  return { runtime, view: computeView(runtime, restoreStatus) };
}

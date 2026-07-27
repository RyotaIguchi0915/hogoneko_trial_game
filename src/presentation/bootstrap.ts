import { DEFAULT_TRIAL_CONFIG, type SaveStorage, type Clock } from '@core/index';
import { Localization } from '@data/index';
import { GameRuntime } from '@app/index';
import { LOCALES } from '@content/locales';
import { derivePlayerKnowledge } from '@perception/index';
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
  const phenomena = runtime.observe();
  const observations = phenomena.map((p) => localization.resolve(p.descriptor));
  const catSprite = spriteForDescriptor(phenomena[0]?.descriptor);
  const progress = runtime.reader.getProgress();
  // Player Knowledge を観察履歴から再生成（保存しない・G-2）。回数は「観測回数」で Cat State ではない（I-1）。
  const knowledge = derivePlayerKnowledge(runtime.reader.getObservationLog());
  const knowledgeNotes = knowledge.observed.map(
    (o) => `${localization.resolve(o.descriptor)}${o.count > 1 ? ` ×${o.count}` : ''}`,
  );
  return {
    restoreStatus,
    day: progress.day,
    segment: progress.segment,
    segmentsPerDay: DEFAULT_TRIAL_CONFIG.segmentsPerDay,
    phase: progress.phase,
    observations,
    catSprite,
    actionSlots: runtime.reader.getActionSlots(),
    knowledgeNotes,
  };
}

export function bootstrap(deps: BootstrapDeps): BootstrapResult {
  const runtime = GameRuntime.create({
    storage: deps.storage,
    clock: deps.clock,
    seed: deps.seed,
    ...(deps.buildVersion !== undefined ? { buildVersion: deps.buildVersion } : {}),
  });
  const restoreStatus = runtime.reader.getRestoreStatus();
  return { runtime, view: computeView(runtime, restoreStatus) };
}

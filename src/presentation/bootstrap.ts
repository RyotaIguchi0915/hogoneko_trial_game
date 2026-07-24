import { DEFAULT_TRIAL_CONFIG, type SaveStorage, type Clock } from '@core/index';
import { GameRuntime } from '@app/index';
import type { AppView } from './App';

/**
 * Bootstrap — 起動配線の本体（EP-14）。副作用の注入点を引数に集約し、テスト可能にする。
 *
 * ブラウザ固有依存（storage/clock/seed）は呼び出し側（main.tsx）が渡す。
 * ⚠️ この層は L2 を**直接** import しない。合成ルート（src/app）越しに不透明ハンドルを受け取り、
 *    受け取るのは全体進行のみ（憲章 I-1・Cat State には到達しない）。
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

export function bootstrap(deps: BootstrapDeps): BootstrapResult {
  const runtime = GameRuntime.create({
    storage: deps.storage,
    clock: deps.clock,
    seed: deps.seed,
    ...(deps.buildVersion !== undefined ? { buildVersion: deps.buildVersion } : {}),
  });

  // 起動時に読み込んだ進行（= リロード復元の証跡）。前進より前に採取する。
  const restoreStatus = runtime.reader.getRestoreStatus();

  // ⚠️ Sprint 1 骨格の「時間が進む」実演: 起動ごとに 1 Segment だけ前進させ、自動保存する。
  //    本番の進行契機は Sprint 2 の明示的な Day 確定に置き換える（AD-89/90: フレーム/実時間で
  //    Simulation を回さない）。ここは更新ループと保存配線の疎通確認に限る。
  if (runtime.reader.getProgress().phase === 'running') {
    runtime.advanceSegment();
    const result = runtime.save();
    if (!result.ok) {
      // 保存失敗を握りつぶさない（AA-75）。診断用に内部ログのみ（憲章§11.4）。
      console.warn('[save] まだ保存できていません:', result.reason);
    }
  }

  const progress = runtime.reader.getProgress();
  const view: AppView = {
    restoreStatus,
    day: progress.day,
    segment: progress.segment,
    segmentsPerDay: DEFAULT_TRIAL_CONFIG.segmentsPerDay,
    phase: progress.phase,
  };

  return { runtime, view };
}

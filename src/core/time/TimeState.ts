/**
 * Time — 時間の Functional Core（L1 Core / B4 C-02・§6）
 *
 * 純粋関数で時間遷移を表現する（DevConst §5.1 Functional Core）。
 * 副作用（イベント発行・保持）は TimeSystem（Imperative Shell）が担う。
 *
 * 粒度（B4 §6.1）: Frame / Tick / Segment / Day / Trial
 *   - Frame/Tick は実時間駆動で L4/Observation の関心（本ファイルは扱わない）
 *   - Segment/Day/Trial が Simulation を駆動する（本ファイル）
 *
 * ⚠️ 時間を巻き戻す関数は提供しない（Pillar 4 / AP-08）。
 * ⚠️ 実時間（壁時計）と連動しない（AP-17）。
 */

export type TimeGranularity = 'frame' | 'tick' | 'segment' | 'day' | 'trial';

/**
 * トライアルの構成（データ駆動）。
 * ⚠️ segmentsPerDay=6 は B5 §1.2 の暫定値。B2 Core Gameplay Loop Bible（未作成/OI-1）で正式化する。
 * ⚠️ totalDays=30 は固定（憲章§14.3）。
 */
export interface TrialConfig {
  readonly totalDays: number;
  readonly segmentsPerDay: number;
}

export const DEFAULT_TRIAL_CONFIG: TrialConfig = {
  totalDays: 30,
  segmentsPerDay: 6,
};

/**
 * デモ用の短縮構成（EP-3.09）。本編30日を数分で通せるよう日数を絞る。
 * ⚠️ 本編は30日固定（憲章§14.3）。これは**デモ専用**の別 config で、合成ルートが情動アークのペースを
 *    日数比で補正して「縮尺でも同じ弧」を見せる（GameRuntime の paceScale）。
 */
export const DEMO_TRIAL_CONFIG: TrialConfig = {
  totalDays: 7,
  segmentsPerDay: 6,
};

export type TrialPhase = 'running' | 'ended';

export interface TimeState {
  /** 1..totalDays。Day 0（到着）の扱いは Scenario の関心（B5 §1.4） */
  readonly day: number;
  /** 0..segmentsPerDay-1 */
  readonly segment: number;
  readonly phase: TrialPhase;
}

export interface SegmentAdvanceResult {
  readonly state: TimeState;
  readonly crossedDay: boolean;
  readonly endedTrial: boolean;
}

/** トライアル開始時の時間 */
export function initialTime(): TimeState {
  return { day: 1, segment: 0, phase: 'running' };
}

/**
 * 1 Segment 進める（純粋）。
 * - 日をまたぐと crossedDay=true
 * - 最終日の最終 Segment を越えると endedTrial=true（day は最終日に留まる）
 * - phase==='ended' 以降は no-op（巻き戻さない・過ぎない）
 */
export function advanceSegment(state: TimeState, config: TrialConfig): SegmentAdvanceResult {
  if (state.phase === 'ended') {
    return { state, crossedDay: false, endedTrial: false };
  }

  const nextSegment = state.segment + 1;
  if (nextSegment < config.segmentsPerDay) {
    return {
      state: { day: state.day, segment: nextSegment, phase: 'running' },
      crossedDay: false,
      endedTrial: false,
    };
  }

  const nextDay = state.day + 1;
  if (nextDay > config.totalDays) {
    return {
      state: { day: state.day, segment: state.segment, phase: 'ended' },
      crossedDay: false,
      endedTrial: true,
    };
  }

  return {
    state: { day: nextDay, segment: 0, phase: 'running' },
    crossedDay: true,
    endedTrial: false,
  };
}

/** 在室 Segment かどうか（B5 §1.2: 朝=1 / 夕=3 / 夜=4 を在室と仮定・暫定） */
export function isInRoomSegment(segment: number): boolean {
  // ⚠️ 在室/不在の割当は B5 §1.2 の暫定。正式化は OI-1。
  const IN_ROOM_SEGMENTS: readonly number[] = [1, 3, 4];
  return IN_ROOM_SEGMENTS.includes(segment);
}

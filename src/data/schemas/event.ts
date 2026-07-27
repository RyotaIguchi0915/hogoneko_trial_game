import {
  defineSchema,
  field,
  isRecord,
  SchemaError,
  type ContentDefinition,
  type ContentSchema,
} from '../registry/ContentDefinition';
import type { ContentRegistry } from '../registry/ContentRegistry';

/**
 * Event / Cue / StateChange / LearningLine スキーマ（L0 Data / B8 §11 / EP-2.09）
 *
 * イベントは「環境・刺激・資源・人」だけを変える。**猫の反応・内部状態は記述しない**（B8 §2.3）。
 *   → その後の猫の行動は Cat AI が自律的に決める。データモデルの最重要の仕事は「記述できなくすること」（B8 §11.2）。
 * ⚠️ `StateChange.target` に `cat.*` を型で表現不可能にする（憲章 I-1・B8 §11.2）。実行時も schema で拒否する。
 * ⚠️ すべてのイベントは direct + indirect の観測可能な Cue を持ち、うち1つは悪循環でも観測可能
 *    （`guaranteedInSpiral`・B8 §5.5/§8.4）。イベント本文・Cue 内容は**監修/Content の管轄**（B8 付録B）。
 *
 * 本 MVP は「定義＋スキーマ検証＋型制限」まで（発火→実行の runtime は次段）。
 */

// --- StateChange（イベントが変えてよいのは環境側だけ・B8 §2.3・§11.2） ---
/**
 * 状態変化の対象。⚠️ `cat.needs`/`cat.affect`/`cat.relationship`/`cat.behavior` は**含めない**。
 * これにより「猫の内部状態はイベントから変えられない」を型で保証する（憲章 I-1・B8 §2.3）。
 * `physiology`（換毛等の生理的必然）は監修必須のため MVP では除外する（B8 §11.2）。
 */
export type StateChangeTarget = 'environment' | 'stimulus' | 'resource' | 'human';

export interface StateChange {
  readonly target: StateChangeTarget;
  /** 適用する Command 種別（Simulation を直接書き換えず Command 経由・B8 §2.2 / AA-51）。 */
  readonly command: string;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
}

// --- Cue（観測可能な手がかり・B8 §11.2） ---
export type CueChannel = 'direct' | 'indirect' | 'sound';

export interface CueSpec {
  /** direct=猫の行動 / indirect=痕跡・環境 / sound=音（B8 §5.5）。 */
  readonly channel: CueChannel;
  /** 対応する Phenomenon 語彙ID（観測境界を越える唯一の形・B4 P-01）。 */
  readonly phenomenon: string;
  /** 観測条件（視線・距離・光量・滞留）。任意。 */
  readonly condition?: string;
  readonly minDurationSegments?: number;
  /** 悪循環（negative spiral）中も観測可能か。indirect（痕跡）に付け、観測機会をゼロにしない（B8 §8.4）。 */
  readonly guaranteedInSpiral?: boolean;
}

// --- Trigger / Termination ---
export type TriggerType =
  'time' | 'state' | 'space' | 'playerAction' | 'lineProgress' | 'probability' | 'composite';

export interface TriggerSpec {
  readonly type: TriggerType;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
}

/** ⚠️ `"playerUnderstanding"` は存在しない（G-2 違反・終了はプレイヤーの理解でなく状態で決まる・B8 §2.5）。 */
export type TerminationType = 'duration' | 'stateCondition' | 'chainProgress';

export interface TerminationSpec {
  readonly type: TerminationType;
  readonly params?: Readonly<Record<string, string | number | boolean>>;
}

// --- Event / LearningLine ---
/** 6役割型（B8 §1.4）。T-1 導入 / T-2 反復 / T-3 対比 / T-4 検証 / T-5 反証 / T-6 再解釈。 */
export type EventRole =
  'seeding' | 'repetition' | 'contrast' | 'verification' | 'falsifying' | 'reinterpretation';

export interface EventDef extends ContentDefinition {
  /** 内部名。⚠️ プレイヤーに表示しない（B8 §11.2）。 */
  readonly internalName: string;
  /** 所属する学習ライン（独立イベントは存在しない・B8 §1.3）。 */
  readonly learningLine: string;
  readonly role: EventRole;
  /** 難度 ★1〜3。 */
  readonly difficulty: number;
  readonly trigger: TriggerSpec;
  /** 状態変化（環境・刺激のみ・B8 §11.2）。 */
  readonly changes: readonly StateChange[];
  /** 観測可能な Cue（direct≥1・indirect≥1・guaranteedInSpiral≥1・B8 §5.5/§8.4）。 */
  readonly cues: readonly CueSpec[];
  readonly termination: TerminationSpec;
}

export interface LearningLineDef extends ContentDefinition {
  /** 内部テーマ名（表示しない）。 */
  readonly insightTheme: string;
  /** 一般化ID（G-01〜G-13・B8 §1.3）。 */
  readonly generalization: string;
  /** 最低3つの異なる文脈（B8 §11.3・contexts<3 は不合格）。 */
  readonly contexts: readonly string[];
  /** 構成イベントID。 */
  readonly events: readonly string[];
}

// --- 検証補助 ---
const STATE_CHANGE_TARGETS = new Set<string>(['environment', 'stimulus', 'resource', 'human']);
const CUE_CHANNELS = new Set<string>(['direct', 'indirect', 'sound']);
const TERMINATION_TYPES = new Set<string>(['duration', 'stateCondition', 'chainProgress']);
const TRIGGER_TYPES = new Set<string>([
  'time',
  'state',
  'space',
  'playerAction',
  'lineProgress',
  'probability',
  'composite',
]);
const EVENT_ROLES = new Set<string>([
  'seeding',
  'repetition',
  'contrast',
  'verification',
  'falsifying',
  'reinterpretation',
]);

function arrayField(rec: Record<string, unknown>, key: string): readonly unknown[] {
  const v = rec[key];
  if (!Array.isArray(v)) throw new SchemaError(`"${key}" must be an array`);
  return v;
}

function optionalParams(
  rec: Record<string, unknown>,
): Readonly<Record<string, string | number | boolean>> | undefined {
  const v = rec.params;
  if (v === undefined) return undefined;
  if (!isRecord(v)) throw new SchemaError('"params" must be an object');
  for (const [k, val] of Object.entries(v)) {
    if (typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') {
      throw new SchemaError(`"params.${k}" must be a string/number/boolean`);
    }
  }
  return v as Record<string, string | number | boolean>;
}

function parseStateChange(raw: unknown): StateChange {
  if (!isRecord(raw)) throw new SchemaError('StateChange must be an object');
  const target = field.string(raw, 'target');
  // ⚠️ 猫の内部状態（cat.*）は指定不可（B8 §2.3・憲章 I-1）。許容値以外はここで拒否する。
  if (!STATE_CHANGE_TARGETS.has(target)) {
    throw new SchemaError(`StateChange.target "${target}" is not allowed (cat.* is forbidden)`);
  }
  const params = optionalParams(raw);
  return {
    target: target as StateChangeTarget,
    command: field.nonEmptyString(raw, 'command'),
    ...(params !== undefined ? { params } : {}),
  };
}

function parseCue(raw: unknown): CueSpec {
  if (!isRecord(raw)) throw new SchemaError('CueSpec must be an object');
  const channel = field.string(raw, 'channel');
  if (!CUE_CHANNELS.has(channel)) throw new SchemaError(`unknown cue channel "${channel}"`);
  const cue: CueSpec = {
    channel: channel as CueChannel,
    phenomenon: field.nonEmptyString(raw, 'phenomenon'),
    ...(raw.condition !== undefined ? { condition: field.string(raw, 'condition') } : {}),
    ...(raw.minDurationSegments !== undefined
      ? { minDurationSegments: field.number(raw, 'minDurationSegments') }
      : {}),
    ...(raw.guaranteedInSpiral !== undefined
      ? { guaranteedInSpiral: field.boolean(raw, 'guaranteedInSpiral') }
      : {}),
  };
  return cue;
}

export const eventSchema: ContentSchema<EventDef> = defineSchema<EventDef>('event', (raw) => {
  const role = field.string(raw, 'role');
  if (!EVENT_ROLES.has(role)) throw new SchemaError(`unknown event role "${role}"`);

  const trigger = raw.trigger;
  if (!isRecord(trigger)) throw new SchemaError('"trigger" must be an object');
  const triggerType = field.string(trigger, 'type');
  if (!TRIGGER_TYPES.has(triggerType))
    throw new SchemaError(`unknown trigger type "${triggerType}"`);

  const termination = raw.termination;
  if (!isRecord(termination)) throw new SchemaError('"termination" must be an object');
  const terminationType = field.string(termination, 'type');
  if (!TERMINATION_TYPES.has(terminationType)) {
    throw new SchemaError(`unknown termination type "${terminationType}"`);
  }

  const difficulty = field.number(raw, 'difficulty');
  if (difficulty < 1 || difficulty > 3) throw new SchemaError('"difficulty" must be 1..3');

  const triggerParams = optionalParams(trigger);
  const terminationParams = optionalParams(termination);
  const changes = arrayField(raw, 'changes').map(parseStateChange);
  const cues = arrayField(raw, 'cues').map(parseCue);

  // B8 §5.5/§8.4/§11.4: direct≥1・indirect≥1・guaranteedInSpiral(true)≥1。
  if (!cues.some((c) => c.channel === 'direct')) {
    throw new SchemaError('event must have at least one direct cue (B8 §5.5)');
  }
  if (!cues.some((c) => c.channel === 'indirect')) {
    throw new SchemaError('event must have at least one indirect cue (B8 §5.5)');
  }
  if (!cues.some((c) => c.guaranteedInSpiral === true)) {
    throw new SchemaError('event must have at least one guaranteedInSpiral cue (B8 §8.4)');
  }

  return {
    id: field.nonEmptyString(raw, 'id'),
    internalName: field.nonEmptyString(raw, 'internalName'),
    learningLine: field.nonEmptyString(raw, 'learningLine'),
    role: role as EventRole,
    difficulty,
    trigger: {
      type: triggerType as TriggerType,
      ...(triggerParams !== undefined ? { params: triggerParams } : {}),
    },
    changes,
    cues,
    termination: {
      type: terminationType as TerminationType,
      ...(terminationParams !== undefined ? { params: terminationParams } : {}),
    },
  };
});

export const learningLineSchema: ContentSchema<LearningLineDef> = defineSchema<LearningLineDef>(
  'learningLine',
  (raw) => {
    const contexts = arrayField(raw, 'contexts').map((c, i) => {
      if (typeof c !== 'string' || c.length === 0)
        throw new SchemaError(`"contexts[${i}]" must be a non-empty string`);
      return c;
    });
    // B8 §11.3/§11.4: contexts が3未満は不合格。
    if (contexts.length < 3) throw new SchemaError('learningLine must have at least 3 contexts');

    const events = arrayField(raw, 'events').map((e, i) => {
      if (typeof e !== 'string' || e.length === 0)
        throw new SchemaError(`"events[${i}]" must be a non-empty string`);
      return e;
    });
    if (events.length === 0)
      throw new SchemaError('learningLine must reference at least one event');

    return {
      id: field.nonEmptyString(raw, 'id'),
      insightTheme: field.nonEmptyString(raw, 'insightTheme'),
      generalization: field.nonEmptyString(raw, 'generalization'),
      contexts,
      events,
    };
  },
);

// --- クロス検証（定義間の参照整合・B8 §11.4 のうち単一定義で閉じない項目） ---
/** 学習ラインの完全性に要る役割（B8 §1.4: T-1/T-3/T-4/T-5。T-5 反証を欠く学習ラインは不完全）。 */
const REQUIRED_ROLES: readonly EventRole[] = ['seeding', 'contrast', 'verification', 'falsifying'];

/**
 * レジストリ全体の参照整合を検証する（B8 §11.4）。純粋・エラー文字列の配列を返す（空なら合格）。
 * - event.learningLine が存在する学習ラインを指すか
 * - Cue.phenomenon が既知の現象語彙か（未定義語彙を作らない・B4 P-02）
 * - learningLine.events が実在し、役割 T-1/T-3/T-4/T-5 を網羅するか
 */
export function crossValidateEvents(registry: ContentRegistry): readonly string[] {
  const errors: string[] = [];
  for (const e of registry.getAll<EventDef>('event')) {
    if (!registry.has('learningLine', e.learningLine)) {
      errors.push(`event "${e.id}" references unknown learningLine "${e.learningLine}"`);
    }
    for (const c of e.cues) {
      if (!registry.has('phenomenon', c.phenomenon)) {
        errors.push(`event "${e.id}" cue references unknown phenomenon "${c.phenomenon}"`);
      }
    }
  }
  for (const line of registry.getAll<LearningLineDef>('learningLine')) {
    const roles = new Set<EventRole>();
    for (const id of line.events) {
      const ev = registry.get<EventDef>('event', id);
      if (!ev) {
        errors.push(`learningLine "${line.id}" references unknown event "${id}"`);
        continue;
      }
      roles.add(ev.role);
    }
    for (const r of REQUIRED_ROLES) {
      if (!roles.has(r)) {
        errors.push(`learningLine "${line.id}" is missing required role "${r}" (T-1/T-3/T-4/T-5)`);
      }
    }
  }
  return errors;
}

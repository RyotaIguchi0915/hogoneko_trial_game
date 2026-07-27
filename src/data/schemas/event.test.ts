import { describe, it, expect } from 'vitest';
import { ContentRegistryBuilder } from '../registry/ContentRegistry';
import { phenomenonSchema } from './phenomenon';
import { eventSchema, learningLineSchema, crossValidateEvents } from './event';
import { PHENOMENON_CONTENT } from '@content/phenomena';
import { EVENT_CONTENT, LEARNING_LINE_CONTENT } from '@content/events';

/** 1件の生イベントを検証しやすい最小の妥当形（各テストで一部を壊す）。 */
function validEvent(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'event.x',
    internalName: 'x',
    learningLine: 'line.safe_place',
    role: 'seeding',
    difficulty: 1,
    trigger: { type: 'time', params: { day: 1 } },
    changes: [
      { target: 'environment', command: 'setZoneCover', params: { zone: 'z', cover: 0.5 } },
    ],
    cues: [
      { channel: 'direct', phenomenon: 'phenomenon.out_of_sight' },
      { channel: 'indirect', phenomenon: 'phenomenon.shed_fur', guaranteedInSpiral: true },
    ],
    termination: { type: 'duration', params: { segments: 1 } },
    ...over,
  };
}

describe('EP-2.09 content — LL-1 がスキーマ検証を通る（B8 §11.4）', () => {
  it('phenomenon + event + learningLine を strict build できる', () => {
    expect(() =>
      new ContentRegistryBuilder()
        .add(phenomenonSchema, PHENOMENON_CONTENT)
        .add(eventSchema, EVENT_CONTENT)
        .add(learningLineSchema, LEARNING_LINE_CONTENT)
        .build({ strict: true }),
    ).not.toThrow();
  });

  it('参照整合（Cue→Phenomenon / line→events / 役割 T-1/T-3/T-4/T-5）を満たす', () => {
    const { registry } = new ContentRegistryBuilder()
      .add(phenomenonSchema, PHENOMENON_CONTENT)
      .add(eventSchema, EVENT_CONTENT)
      .add(learningLineSchema, LEARNING_LINE_CONTENT)
      .build({ strict: true });
    expect(crossValidateEvents(registry)).toEqual([]);
  });
});

describe('EP-2.09 eventSchema — 単一定義の検証（B8 §11.4）', () => {
  it('妥当なイベントを受理する', () => {
    expect(eventSchema.validate(validEvent()).ok).toBe(true);
  });

  it('🔴 StateChange.target に cat.* は拒否（憲章 I-1・B8 §2.3）', () => {
    const bad = validEvent({
      changes: [{ target: 'cat.needs', command: 'setHunger', params: { v: 0 } }],
    });
    const result = eventSchema.validate(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/cat\.\* is forbidden/);
  });

  it('direct Cue が無いと拒否（B8 §5.5）', () => {
    const bad = validEvent({
      cues: [{ channel: 'indirect', phenomenon: 'phenomenon.shed_fur', guaranteedInSpiral: true }],
    });
    expect(eventSchema.validate(bad).ok).toBe(false);
  });

  it('indirect Cue が無いと拒否（B8 §5.5）', () => {
    const bad = validEvent({
      cues: [{ channel: 'direct', phenomenon: 'phenomenon.out_of_sight' }],
    });
    expect(eventSchema.validate(bad).ok).toBe(false);
  });

  it('guaranteedInSpiral の Cue が無いと拒否（B8 §8.4）', () => {
    const bad = validEvent({
      cues: [
        { channel: 'direct', phenomenon: 'phenomenon.out_of_sight' },
        { channel: 'indirect', phenomenon: 'phenomenon.shed_fur' }, // guaranteedInSpiral なし
      ],
    });
    const result = eventSchema.validate(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/guaranteedInSpiral/);
  });

  it('未知の role / termination type を拒否する', () => {
    expect(eventSchema.validate(validEvent({ role: 'clearing' })).ok).toBe(false);
    expect(
      eventSchema.validate(validEvent({ termination: { type: 'playerUnderstanding' } })).ok,
    ).toBe(false); // G-2 違反の型は存在しない（B8 §2.5）
  });
});

describe('EP-2.09 learningLineSchema — 単一定義の検証', () => {
  const validLine = (over: Record<string, unknown> = {}) => ({
    id: 'line.y',
    insightTheme: 't',
    generalization: 'G-03',
    contexts: ['a', 'b', 'c'],
    events: ['event.x'],
    ...over,
  });

  it('妥当な学習ラインを受理する', () => {
    expect(learningLineSchema.validate(validLine()).ok).toBe(true);
  });

  it('contexts が3未満は拒否（B8 §11.3）', () => {
    expect(learningLineSchema.validate(validLine({ contexts: ['a', 'b'] })).ok).toBe(false);
  });
});

describe('EP-2.09 crossValidateEvents — 定義間の参照整合（B8 §11.4）', () => {
  const build = (events: readonly unknown[], lines: readonly unknown[]) =>
    new ContentRegistryBuilder()
      .add(phenomenonSchema, PHENOMENON_CONTENT)
      .add(eventSchema, events)
      .add(learningLineSchema, lines)
      .build({ strict: false }).registry;

  it('Cue が未定義の現象語彙を指すと検出する（B4 P-02）', () => {
    const registry = build(
      [
        validEvent({
          cues: [
            { channel: 'direct', phenomenon: 'phenomenon.does_not_exist' },
            { channel: 'indirect', phenomenon: 'phenomenon.shed_fur', guaranteedInSpiral: true },
          ],
        }),
      ],
      [
        {
          id: 'line.safe_place',
          insightTheme: 't',
          generalization: 'G-03',
          contexts: ['a', 'b', 'c'],
          events: ['event.x'],
        },
      ],
    );
    expect(crossValidateEvents(registry).join()).toMatch(/unknown phenomenon/);
  });

  it('役割 T-1/T-3/T-4/T-5 の欠落を検出する（B8 §1.4）', () => {
    // seeding のみ → contrast/verification/falsifying 欠落。
    const registry = build(
      [validEvent({ id: 'event.only', role: 'seeding' })],
      [
        {
          id: 'line.safe_place',
          insightTheme: 't',
          generalization: 'G-03',
          contexts: ['a', 'b', 'c'],
          events: ['event.only'],
        },
      ],
    );
    const errors = crossValidateEvents(registry).join();
    expect(errors).toMatch(/missing required role "contrast"/);
    expect(errors).toMatch(/missing required role "falsifying"/);
  });
});

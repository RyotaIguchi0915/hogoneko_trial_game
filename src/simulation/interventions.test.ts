import { describe, it, expect } from 'vitest';
import { initialCatState } from '@core/state/catState';
import { feedCat, INTERVENTION_PROVISIONAL } from './interventions';

describe('feedCat（介入・B2 §4 / B9 §3.4）', () => {
  it('空腹（hunger）を下げる', () => {
    const cat = { ...initialCatState(), needs: { safety: 0.3, hunger: 0.8, elimination: 0.2 } };
    const fed = feedCat(cat);
    expect(fed.needs.hunger).toBeCloseTo(0.8 - INTERVENTION_PROVISIONAL.feedHungerRelief);
  });

  it('空腹は 0 未満にならない（clamp）', () => {
    const cat = { ...initialCatState(), needs: { safety: 0.3, hunger: 0.1, elimination: 0.2 } };
    expect(feedCat(cat).needs.hunger).toBe(0);
  });

  it('hunger 以外の状態は変えない（副作用の局所化）', () => {
    const cat = initialCatState();
    const fed = feedCat(cat);
    expect(fed.affect).toEqual(cat.affect);
    expect(fed.relationship).toEqual(cat.relationship);
    expect(fed.behavior).toBe(cat.behavior);
    expect(fed.needs.safety).toBe(cat.needs.safety);
  });
});

import { describe, it, expect } from 'vitest';
import { GameManager } from './GameManager';
import type { GameModule } from './GameModule';

function makeModule(id: string, log: string[]): GameModule {
  return {
    id,
    init: () => log.push(`init:${id}`),
    dispose: () => log.push(`dispose:${id}`),
  };
}

describe('GameManager', () => {
  it('登録順に init し、逆順に dispose する', () => {
    const log: string[] = [];
    const gm = new GameManager();
    gm.register(makeModule('a', log)).register(makeModule('b', log)).register(makeModule('c', log));
    gm.init();
    gm.dispose();
    expect(log).toEqual(['init:a', 'init:b', 'init:c', 'dispose:c', 'dispose:b', 'dispose:a']);
  });

  it('ID 重複を拒否する', () => {
    const gm = new GameManager();
    gm.register({ id: 'x' });
    expect(() => gm.register({ id: 'x' })).toThrow(/duplicate module id/);
  });

  it('init 後の register を拒否する', () => {
    const gm = new GameManager();
    gm.register({ id: 'x' });
    gm.init();
    expect(() => gm.register({ id: 'y' })).toThrow(/after init/);
  });

  it('二重 init を拒否する', () => {
    const gm = new GameManager();
    gm.init();
    expect(() => gm.init()).toThrow(/already initialized/);
  });

  it('init/dispose を省略したモジュールも扱える', () => {
    const gm = new GameManager();
    gm.register({ id: 'noop' });
    expect(() => {
      gm.init();
      gm.dispose();
    }).not.toThrow();
  });

  it('moduleIds と initialized を報告する', () => {
    const gm = new GameManager();
    gm.register({ id: 'a' }).register({ id: 'b' });
    expect(gm.moduleIds).toEqual(['a', 'b']);
    expect(gm.initialized).toBe(false);
    gm.init();
    expect(gm.initialized).toBe(true);
  });
});

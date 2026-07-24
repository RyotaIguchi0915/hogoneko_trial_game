import type { GameModule } from './GameModule';

/**
 * GameManager — ライフサイクル統括（L1 Core / B4 C-01）
 *
 * 責務: 登録・初期化順序の保証・破棄のみ。
 * ⚠️ ゲームロジックを持たない。他モジュールの内部状態を直接書き換えない（B4 C-01 禁止事項）。
 */
export class GameManager {
  readonly #modules: GameModule[] = [];
  #initialized = false;

  /** モジュールを登録する（初期化前のみ・ID 重複を拒否） */
  register(module: GameModule): this {
    if (this.#initialized) {
      throw new Error('GameManager: cannot register modules after init()');
    }
    if (this.#modules.some((m) => m.id === module.id)) {
      throw new Error(`GameManager: duplicate module id "${module.id}"`);
    }
    this.#modules.push(module);
    return this;
  }

  /** 登録順に init() を呼ぶ */
  init(): void {
    if (this.#initialized) {
      throw new Error('GameManager: already initialized');
    }
    for (const module of this.#modules) {
      module.init?.();
    }
    this.#initialized = true;
  }

  /** 登録の逆順に dispose() を呼ぶ */
  dispose(): void {
    for (const module of [...this.#modules].reverse()) {
      module.dispose?.();
    }
    this.#modules.length = 0;
    this.#initialized = false;
  }

  get initialized(): boolean {
    return this.#initialized;
  }

  get moduleIds(): readonly string[] {
    return this.#modules.map((m) => m.id);
  }
}

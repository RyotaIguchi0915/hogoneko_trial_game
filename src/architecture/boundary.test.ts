import { describe, it, expect, beforeAll } from 'vitest';
import { ESLint } from 'eslint';
import * as ts from 'typescript';

/**
 * 境界違反テストスイート（EP-10 / B4 §0・⑦・憲章 I-1）
 *
 * 「意図的な境界違反が機械的に検出される」ことを恒久テストにする。
 * EP-03 ではその場で実証したが、ここでは ESLint の Node API で違反コード片を lint し、
 * 期待するルールが発火することを CI が毎回検証する。これが緩めば全ての憲章保証が崩れる。
 *
 * ⚠️ Player Knowledge→Simulation の G-2 は本スイートで強制済み（下記ケース）。
 *    残る検査（Phenomenon への数値フィールド追加の検出）は対象が揃い次第追加する。
 */

interface ViolationCase {
  readonly name: string;
  readonly filePath: string;
  readonly code: string;
  readonly rule: string;
}

// 各違反は「解決可能な実ファイル」への import か、ルール単独で発火する構文にしている。
const CASES: readonly ViolationCase[] = [
  {
    name: '🔴 L4→Cat State 権限（capability）は憲章 I-1 違反',
    filePath: 'src/presentation/_violation.ts',
    code: `import { SimulationCapability } from '../core/state/capability';\nexport const c = SimulationCapability;\n`,
    rule: 'import/no-restricted-paths',
  },
  {
    name: '🔴 L4→simulationAccess は憲章 I-1 違反',
    filePath: 'src/presentation/_violation.ts',
    code: `import { getSimulationStateAccess } from '../core/state/simulationAccess';\nexport const a = getSimulationStateAccess;\n`,
    rule: 'import/no-restricted-paths',
  },
  {
    name: '🔴 L3 Player Knowledge → L2 Simulation は G-2 違反（真実に到達しない）',
    filePath: 'src/perception/_violation.ts',
    code: `import { feedCat } from '../simulation/index';\nexport const f = feedCat;\n`,
    rule: 'import/no-restricted-paths',
  },
  {
    name: 'L1 Core → L4 Presentation は逆流（DR-7）',
    filePath: 'src/core/_violation.ts',
    code: `import { App } from '../presentation/App';\nexport const a = App;\n`,
    rule: 'import/no-restricted-paths',
  },
  {
    name: 'L0 Data → L1 Core は葉ノード違反（DR-8）',
    filePath: 'src/data/_violation.ts',
    code: `import { GameManager } from '../core/module/GameManager';\nexport const g = GameManager;\n`,
    rule: 'import/no-restricted-paths',
  },
  {
    name: 'Math.random は決定論性違反（G-3 / AD-17）',
    filePath: 'src/core/_violation.ts',
    code: `export const r = Math.random();\n`,
    rule: 'no-restricted-properties',
  },
  {
    name: 'Date.now は決定論性違反（G-3 / AD-38）',
    filePath: 'src/core/_violation.ts',
    code: `export const t = Date.now();\n`,
    rule: 'no-restricted-properties',
  },
  {
    name: '禁止語彙（affection 相当）は識別子に使えない（B0 §10.2）',
    filePath: 'src/core/_violation.ts',
    code: `export const affection = 1;\n`,
    rule: 'id-denylist',
  },
  {
    name: 'console は純粋層（L0〜L3）で禁止（デバッグコード検出）',
    filePath: 'src/core/_violation.ts',
    code: `export function f(): void { console.log('x'); }\n`,
    rule: 'no-console',
  },
  {
    name: 'debugger は全域で禁止',
    filePath: 'src/core/_violation.ts',
    code: `export function f(): void { debugger; }\n`,
    rule: 'no-debugger',
  },
];

describe('境界・規約の機械的強制（EP-10）', () => {
  let eslint: ESLint;

  beforeAll(() => {
    // プロジェクトの eslint.config.js（flat config）を自動使用する。
    eslint = new ESLint();
  });

  it.each(CASES)('$name → $rule で検出される', async ({ filePath, code, rule }) => {
    const results = await eslint.lintText(code, { filePath });
    const ruleIds = results.flatMap((r) => r.messages.map((m) => m.ruleId));
    expect(ruleIds).toContain(rule);
  });

  it('正しい向き（L4→L1 Core）の import は許可される', async () => {
    const clean = `import { GameManager } from '../core/module/GameManager';\nexport const g = GameManager;\n`;
    const results = await eslint.lintText(clean, { filePath: 'src/presentation/_ok.ts' });
    const restricted = results
      .flatMap((r) => r.messages)
      .filter((m) => m.ruleId === 'import/no-restricted-paths');
    expect(restricted).toHaveLength(0);
  });
});

/**
 * Phenomenon 数値禁止（観測境界の型ガード・B4 P-01 / EP-10 / EP-2.11）。
 *
 * Phenomenon.ts は NumericFieldKeys<T> ガードで「数値フィールドを持つとコンパイルが落ちる」ことを保証する。
 * ここではそのガード機構を TypeScript コンパイラ API で type-check し、
 * 「数値フィールドありは型エラー / なしはエラーなし」を CI が毎回検証する（規律ではなく構造で守る）。
 */
function typeCheckErrors(code: string): readonly string[] {
  const fileName = 'phenomenon-guard-check.ts';
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.ES2022, true);
  const host: ts.CompilerHost = {
    getSourceFile: (name) => (name === fileName ? source : undefined),
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: () => undefined,
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    getCanonicalFileName: (f) => f,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => name === fileName,
    readFile: () => undefined,
  };
  const program = ts.createProgram([fileName], { noEmit: true, noLib: true, strict: true }, host);
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName === fileName)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
}

// Phenomenon.ts と同じガード（数値フィールドがあれば never でなくなり never 代入で落ちる）。
const GUARD =
  'type NumericFieldKeys<T> = { readonly [K in keyof T]-?: T[K] extends number ? K : never }[keyof T];\n';

describe('Phenomenon 数値禁止（型ガード・EP-2.11）', () => {
  it('数値フィールドを持つ Phenomenon 相当型はコンパイルで落ちる', () => {
    const bad =
      GUARD +
      'interface P { readonly descriptor: string; readonly value: number; }\n' +
      'const _assert: NumericFieldKeys<P> extends never ? true : never = true;\n' +
      'export { _assert };\n';
    expect(typeCheckErrors(bad).length).toBeGreaterThan(0);
  });

  it('数値フィールドを持たない Phenomenon 相当型は型エラーにならない', () => {
    const clean =
      GUARD +
      'interface P { readonly descriptor: string; readonly observability: boolean; }\n' +
      'const _assert: NumericFieldKeys<P> extends never ? true : never = true;\n' +
      'export { _assert };\n';
    expect(typeCheckErrors(clean)).toEqual([]);
  });
});

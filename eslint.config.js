import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

/**
 * ESLint flat config — Development Constitution ⑤⑥ の機械的強制。
 *
 * ここは EP-10「Layer Boundary Enforcement」の中核が始まる場所。
 * 観測境界（B4 §0）と依存規則（B4 ⑦）を、規律ではなく構造で守る。
 */

// 層の物理ディレクトリ
const L0_DATA = './src/data';
const L1_CORE = './src/core';
const L2_SIM = './src/simulation';
const L3_PERC = './src/perception';
const L4_PRES = './src/presentation';

// 禁止語彙（B0 §10.2）を識別子に持ち込ませない。
// 内部状態は Trust / Familiarity 等を使う。「好感度/懐き度」相当は禁止。
const FORBIDDEN_IDENTIFIERS = [
  'affection',
  'affinity',
  'tameLevel',
  'tameness',
  'taming',
  'favorability',
  'likeability',
  'petLevel',
];

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '*.config.js', '*.config.ts'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
    },
    rules: {
      // 未使用引数は _ 接頭で許容（権限トークン等・DevConst ⑤）
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // --- 禁止語彙（B0 §10.2 / AD-52） ---
      'id-denylist': ['error', ...FORBIDDEN_IDENTIFIERS],

      // --- 循環依存の検出（B4 ⑦ DR / EP-03 依存グラフ検証・EP-10） ---
      // 同層の相互参照は Event Bus 経由にする（AA-17 回避）。型のみの循環も許さない。
      'import/no-cycle': ['error', { ignoreExternal: true }],

      // --- デバッグコード検出（EP-03 Success Criteria） ---
      'no-debugger': 'error',

      // --- 層境界（B4 §0・⑦ / DR-2/3/4） ---
      // 上位→下位のみ許可。逆流・層飛ばしは全面禁止。
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // 🔴 L4 Presentation は L2 Simulation を参照禁止（憲章 I-1 / DR-3）
            {
              target: L4_PRES,
              from: L2_SIM,
              message: 'L4→L2 参照は憲章 I-1 違反。Perception 層（Phenomenon）経由でのみ受け取る。',
            },
            // L2 Simulation は上位（L3/L4）を参照禁止（DR-2 逆流）
            {
              target: L2_SIM,
              from: [L3_PERC, L4_PRES],
              message: 'L2→上位は逆流（DR-2）。Command / Event Bus 経由にする。',
            },
            // L3 Perception は L4 を参照禁止（DR-2 逆流）
            {
              target: L3_PERC,
              from: L4_PRES,
              message: 'L3→L4 は逆流（DR-2）。',
            },
            // L1 Core は L2/L3/L4 を参照禁止（B4 DR-7）
            {
              target: L1_CORE,
              from: [L2_SIM, L3_PERC, L4_PRES],
              message: 'L1 Core は上位層を知らない（B4 DR-7）。',
            },
            // L0 Data は誰も参照しない葉ノード（B4 DR-8）
            {
              target: L0_DATA,
              from: [L1_CORE, L2_SIM, L3_PERC, L4_PRES],
              message: 'L0 Data は参照されるのみ（B4 DR-8）。',
            },
            // 🔴 Cat State 権限トークンの取得元を L3/L4 から遮断（憲章 I-1 / SM-5）
            {
              target: [L3_PERC, L4_PRES],
              from: ['./src/core/state/simulationAccess.ts', './src/core/state/capability.ts'],
              message:
                'Cat State は L2 限定（憲章 I-1）。L3/L4 は権限トークンを取得できない。Phenomenon 経由で受け取る。',
            },
            // ⚠️ L3→L2 を Perception Gateway 経由のみに限定する制約は EP-10 で追加する。
          ],
        },
      ],
    },
  },

  // --- 決定論性の強制（L0〜L3）: Math.random / Date.now 禁止（AD-17 / AD-38） ---
  // RNG は RNG Service、時間は Time System 経由（B4 C-05 / C-02 / G-3）。
  {
    files: ['src/data/**', 'src/core/**', 'src/simulation/**', 'src/perception/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: '決定論性(B4 G-3)違反。RNG Service を使う（AD-17）。',
        },
        {
          object: 'Date',
          property: 'now',
          message: '決定論性(B4 G-3)違反。Time System を使う（AD-38）。',
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message: '決定論性のため Date を直接使わない。Time System 経由（AD-38）。',
        },
      ],

      // 純粋層（L0〜L3）に console を残さない（デバッグコード検出・EP-03）。
      // 開発時の真実可視化は EP-12 Dev Tools（別層・本番除去）で行う。
      'no-console': 'error',
    },
  },

  // --- L4 Presentation: React ---
  {
    files: ['src/presentation/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // --- テスト: 制約を緩めない範囲で例外 ---
  {
    files: ['tests/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);

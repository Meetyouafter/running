import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import boundaries from 'eslint-plugin-boundaries'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared']
const lowerLayers = (layer) => LAYERS.slice(LAYERS.indexOf(layer) + 1)

const publicApiOf = (types) => ({ element: { type: types, fileInternalPath: 'index.ts' } })

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // ─── Feature-Sliced Design boundaries (src/ only) ─────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
      },
      'boundaries/root-path': import.meta.dirname,
      'boundaries/ignore': ['src/main.tsx'],
      'boundaries/elements': [
        { type: 'app',      pattern: 'src/app',        partialMatch: false },
        { type: 'pages',    pattern: 'src/pages/*',    partialMatch: false, capture: ['slice'] },
        { type: 'widgets',  pattern: 'src/widgets/*',  partialMatch: false, capture: ['slice'] },
        { type: 'features', pattern: 'src/features/*', partialMatch: false, capture: ['slice'] },
        { type: 'entities', pattern: 'src/entities/*', partialMatch: false, capture: ['slice'] },
        { type: 'shared',   pattern: 'src/shared/*',   partialMatch: false, capture: ['segment'] },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/no-ignored-dependencies': 'error',

      'boundaries/dependencies': ['error', {
        default: 'disallow',
        message: 'FSD: {{ from.element.type }} "{{ from.element.path }}" may not import {{ to.element.type }} "{{ to.element.path }}" via "{{ dependency.source }}"',
        policies: [
          // app / pages / widgets / features: only lower layers, only via public API.
          ...['app', 'pages', 'widgets', 'features'].map(layer => ({
            from: { element: { type: layer } },
            allow: { to: publicApiOf(lowerLayers(layer)) },
          })),
          // entities: shared, plus other entities strictly through their `@x/<consumer>` API.
          { from: { element: { type: 'entities' } }, allow: { to: publicApiOf(['shared']) } },
          {
            from: { element: { type: 'entities' } },
            allow: {
              to: { element: { type: 'entities', fileInternalPath: '@x/{{ from.element.captured.slice }}.ts' } },
            },
          },
          // shared segments may use each other's public API.
          { from: { element: { type: 'shared' } }, allow: { to: publicApiOf(['shared']) } },
        ],
      }],
    },
  },

  // Slice index files are barrels — the react-refresh rule is meaningless there.
  {
    files: ['src/**/index.ts'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])

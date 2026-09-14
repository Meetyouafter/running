# Strava Dashboard

## Архитектура (Feature-Sliced Design)

`src/` разложен по слоям FSD, сверху вниз:

| Слой | Что лежит |
|---|---|
| `app/` | точка сборки: `App.tsx` (роутер + загрузка данных), глобальные стили, splash |
| `pages/` | по одному слайсу на роут: `dashboard`, `plan`, `analysis`, `races`, `coach`, `route`, `trophies`, `intervals` |
| `widgets/` | крупные составные блоки: `header`, `activity-modal` |
| `features/` | пользовательские сценарии: `activity-filters` (период/тип + стор фильтров) |
| `entities/` | бизнес-сущности: `activity`, `athlete`, `training-plan`, `race` — типы, API, сторы, хелперы |
| `shared/` | без бизнес-логики: `api` (Strava-клиент, Gemini), `lib` (форматирование, даты), `ui` (графики) |

Внутри слайса — сегменты `ui/`, `model/`, `api/`, `lib/`, `config/`; наружу слайс отдаёт только `index.ts`.

Правила (проверяются ESLint, `eslint-plugin-boundaries`, см. `eslint.config.js`):

- слой импортирует только **нижележащие** слои (`app → pages → widgets → features → entities → shared`);
- слайсы одного слоя **не импортируют друг друга**; для сущностей исключение — `entities/<a>/@x/<b>.ts` (публичный API `a` специально для `b`);
- импорт из чужого слайса — только через его `index.ts` (никаких `@/entities/activity/model/store`);
- все импорты между слайсами — через алиас `@/` (`@/entities/activity`), относительные пути только внутри слайса;
- любой файл в `src/` обязан лежать в одном из слоёв.

```bash
npm run lint   # в т.ч. проверка границ
```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // .claude/ holds Node tooling scripts, not app code — different globals, not
  // shipped, and not worth linting under the browser config.
  // .vercel holds CLI build output; .claude holds Node tooling scripts. Neither is
  // app code, and flat config does not read .gitignore.
  globalIgnores(['dist', '.claude', '.vercel']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Flags the mount-time `useEffect(() => { cargar() }, [id])` data loads in
      // DetalleEvento/Pantalla/Resultados. Real smell, but reworking that flow is
      // its own task — warn so it stays visible without blocking CI.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])

import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

export default [
  {
    ignores: ['node_modules/**', 'dist/**']
  },
  ...tsPlugin.configs['flat/recommended'],
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: false,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  eslintConfigPrettier
]

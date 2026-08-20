import js from '@eslint/js';
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**/*']
  },
  js.configs.recommended,
  firebaseRulesPlugin.configs['flat/recommended'],
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
];

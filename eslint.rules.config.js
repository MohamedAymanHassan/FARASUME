import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['firestore.rules', 'DRAFT_firestore.rules'],
    plugins: {
      firebase: firebaseRulesPlugin
    },
    processor: 'firebase/rules',
    languageOptions: {
      parser: tsParser
    },
    rules: {
      'firebase/no-invalid-rule-syntax': 'error'
    }
  }
];

module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  rules: {
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'import/no-unresolved': 'off',
  },
  overrides: [
    {
      files: ['**/*.ts'],
      env: {
        node: true,
      },
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      rules: {},
    },
  ],
};

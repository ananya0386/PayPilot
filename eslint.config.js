// Code-style checks: run "npx expo lint".
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'functions/node_modules/*'] },
  // Cloud Functions and backend tests run in Node.js.
  { files: ['functions/**/*.js', 'tests/**/*.js'], languageOptions: { globals: globals.node } },
]);

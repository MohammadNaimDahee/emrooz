/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: false,
  extends: [require.resolve('./base.cjs')],
  env: { 'react-native/react-native': true, browser: true },
  settings: { react: { version: 'detect' } },
};

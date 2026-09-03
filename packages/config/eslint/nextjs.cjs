/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: false,
  extends: [require.resolve('./base.cjs'), 'next/core-web-vitals', 'next/typescript', 'prettier'],
  rules: {
    'react/no-unescaped-entities': 'off',
    '@next/next/no-html-link-for-pages': 'off',
  },
};

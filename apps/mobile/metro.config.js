// Metro config with pnpm + Turborepo monorepo support.
//
// Two things Metro needs help with in a pnpm workspace:
//
// 1. watchFolders + nodeModulesPaths so it can find hoisted dependencies at
//    the workspace root (they're not in apps/mobile/node_modules).
//
// 2. Symlink following. pnpm stores every package inside
//    node_modules/.pnpm/<pkg>@<ver>_<hash>/node_modules/<pkg> and exposes it
//    via a symlink at node_modules/<pkg>. Without unstable_enableSymlinks,
//    Metro follows the symlink to the real path and then treats it as a
//    relative import from the project root — which produces the classic
//    "Unable to resolve module ./node_modules/.pnpm/..." crash on HMR or
//    initial bundling.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;

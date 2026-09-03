// Explicit entry file. Referenced from package.json "main".
//
// Why not use `"main": "expo-router/entry"` directly?
// In a pnpm workspace, Metro sometimes writes the pnpm-store-absolute path
// of `expo-router/entry` into the HMR/bundle-graph and can't re-resolve it
// on reconnect ("Unable to resolve module ./node_modules/.pnpm/...").
// A local entry file gives Metro a stable, workspace-relative starting
// module and lets the standard require chain do the rest.
import 'expo-router/entry';

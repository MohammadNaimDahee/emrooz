#!/usr/bin/env node
/**
 * Strip iOS entitlements that a personal Apple Developer team (free tier)
 * cannot sign. Runs after `expo prebuild` so it fires regardless of plugin
 * mod ordering — the Expo mod-compiler chain is subtle to get right for
 * an "override a plugin's entitlements" case, whereas a post-prebuild
 * file edit is trivially predictable.
 *
 * Blocked keys:
 *
 *   - aps-environment                     (Push Notifications)
 *   - com.apple.developer.associated-domains
 *
 * Emrooz uses local notifications only (see src/notifications/reminder.ts),
 * which do NOT require aps-environment. Universal links via
 * associated-domains are nice-to-have but need a paid team; the emrooz://
 * scheme continues to work.
 *
 * On a paid team, delete this script (or its call sites in package.json)
 * to keep the capabilities.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENTITLEMENTS = resolve(HERE, '..', 'ios', 'Emrooz', 'Emrooz.entitlements');

const BLOCKED = ['aps-environment', 'com.apple.developer.associated-domains'];

if (!existsSync(ENTITLEMENTS)) {
  // No prebuild yet, or a subsequent prebuild hasn't run. Nothing to do.
  process.exit(0);
}

let contents = readFileSync(ENTITLEMENTS, 'utf8');
let mutated = false;
for (const key of BLOCKED) {
  const patterns = [
    // <key>foo</key><string>bar</string>
    new RegExp(`\\s*<key>${escape(key)}</key>\\s*<string>[^<]*</string>`, 'g'),
    // <key>foo</key><array>...</array> or dict/data
    new RegExp(`\\s*<key>${escape(key)}</key>\\s*<(array|dict|data|integer)>[\\s\\S]*?</\\1>`, 'g'),
    // <key>foo</key><true/> or <false/>
    new RegExp(`\\s*<key>${escape(key)}</key>\\s*<(?:true|false)/>`, 'g'),
  ];
  for (const p of patterns) {
    if (p.test(contents)) {
      contents = contents.replace(p, '');
      mutated = true;
    }
  }
}

if (mutated) {
  writeFileSync(ENTITLEMENTS, contents, 'utf8');
  console.log('[emrooz] stripped personal-team-blocked entitlements from Emrooz.entitlements');
} else {
  console.log('[emrooz] no personal-team-blocked entitlements found — nothing to strip');
}

function escape(raw) {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

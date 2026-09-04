# Mobile release checklist

- App display name: Emrooz
- URL scheme: `emrooz://`
- Universal / app links prepared for `emroozapp.com`
- Placeholder bundle IDs: `com.emrooz.app.placeholder` (iOS) and `com.emrooz.app.placeholder` (Android). Replace before submission.
- EAS build profiles: development / preview / production (add via `eas build:configure`).
- TheMealDB production supporter subscription **required** before store release (see [`recipe-sourcing-and-licensing.md`](./recipe-sourcing-and-licensing.md)).

## Screenshots and store copy

- Show a globally varied experience. Do not lead with only Afghan content; include suggestions from at least three cuisines in your primary screenshots.
- Store description should present Emrooz as a general-purpose cooking assistant.

## App Store privacy

- Data types collected: email (registered users), dietary preferences, cooking history, pantry, meal plan.
- All data is stored on the user's device or, for registered users, in their private Supabase row (RLS enforced).
- No analytics or advertising trackers ship in v1.
- Account deletion is exposed in-app.

Do not submit builds externally without explicit authorization.

## Local iOS builds on a personal (free) Apple Developer team

A personal Apple team cannot sign apps that request the Push Notifications
(`aps-environment`) or Associated Domains
(`com.apple.developer.associated-domains`) capabilities. Xcode refuses with:

> Personal development teams do not support the Associated Domains and Push
> Notifications capabilities.

Emrooz only uses **local** notifications (scheduled on-device via
`expo-notifications`), which do **not** need `aps-environment`. Universal
links via associated domains are a paid-team feature; the `emrooz://` scheme
continues to work without them.

To keep local dev builds signable on a personal team, both capabilities are
stripped from `apps/mobile/ios/Emrooz/Emrooz.entitlements` after every
`expo prebuild`. The scripts are wired so this is automatic:

```
pnpm --filter @emrooz/mobile prebuild:ios   # prebuild + strip
pnpm --filter @emrooz/mobile ios            # prebuild + strip + run
```

The strip step lives at
`apps/mobile/scripts/strip-personal-team-entitlements.mjs`. On a paid team,
delete that script (or remove its call sites in
`apps/mobile/package.json`) to keep both capabilities.

Android is unaffected — its equivalent capabilities are declared in
`AndroidManifest.xml` and do not require paid team enrollment.

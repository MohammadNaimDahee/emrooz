# Emrooz — Complete Claude Code Master Build Prompt

You are a senior product engineer, React Native engineer, full-stack TypeScript engineer, database architect, security engineer, test engineer, and product designer. Build a complete, high-quality Version 1 of a cooking recommendation product named Emrooz.

Do not produce only a plan, design mockup, proof of concept, or project skeleton. Implement the working mobile application, complete web application, backend, database, authentication, recipe ingestion system, recommendation engine, administration tools, automated tests, offline behavior, backups, documentation, and deployment preparation.

Work autonomously. Make sensible product and engineering decisions when details are not specified. Ask questions only when a genuine blocker cannot be resolved safely. Do not stop after scaffolding or after completing only one platform.

## 1. Product identity

- Product name: Emrooz
- Domain: emroozapp.com
- Tagline: What should I cook today?
- Product positioning: A global, cuisine-agnostic personal cooking assistant.
- Target market from day one: International. Emrooz is built as a worldwide product, not a regional one.
- Launch content emphasis: Afghan cuisine is the first fully curated collection in Version 1 because it is currently underserved by mainstream cooking apps. This is a content strategy, not a product identity — the app itself must feel equally at home for a user cooking Italian, Japanese, Mexican, Indian, or any other cuisine.
- Platforms:
  - iOS mobile application
  - Android mobile application
  - Complete responsive web application
  - Installable Progressive Web App
- Primary purpose: Help people anywhere in the world decide what to cook based on their available ingredients, time, tastes, household, dietary needs, cooking history, and preferred cuisines.

Emrooz must feel like a personal cooking assistant rather than a random recipe generator. It must not read, look, or feel like an Afghan-only app. A first-time user who has never heard of Afghan food must immediately recognize Emrooz as a general-purpose cooking companion that happens to have unusually strong Afghan coverage.

## 2. Product goals

The product must:

- Make deciding what to cook fast and pleasant for anyone, anywhere, cooking any cuisine.
- Present a small number of relevant suggestions instead of overwhelming the user.
- Learn from favorites, dislikes, cooking history, pantry contents, and feedback.
- Treat every cuisine as a first-class citizen. Country, cuisine, and region must be modeled as data, never hard-coded, so no cuisine is privileged in the application logic.
- Support authentic regional and household variations for every cuisine, including but not limited to Afghan food.
- Give Afghan food first-class treatment as one strong launch collection, rather than grouping it vaguely under Middle Eastern or Asian food — but never at the expense of coverage or quality of other cuisines the app serves.
- Expand to additional international cuisines without redesigning the data model, the UI, or the recommendation engine.
- Work for guest users without requiring registration.
- Synchronize a registered user’s data across mobile and web.
- Remain useful offline on mobile.
- Continue operating if an external recipe provider disappears.
- Protect allergy and dietary information.
- Keep recipe content, image rights, provenance, and attribution auditable.

## 3. Version 1 boundaries

Include all features required below.

The following are outside Version 1:

- Payments and subscriptions
- Restaurant ordering or food delivery
- Public comments
- Public star ratings
- Social feeds
- Influencer features
- Automatically publishing AI-generated recipes
- Medical or diagnostic nutrition advice

Prepare clean extension points for future features without implementing speculative complexity.

## 4. Delivery priority

Implement in this order:

1. Shared domain model and project foundation
2. Mobile application
3. Supabase database and synchronization
4. Complete web application
5. Recipe ingestion and administration
6. Offline synchronization and backups
7. Automated tests, quality checks, and deployment preparation

Mobile is the first product priority, but the assignment is not complete until both mobile and web are fully functional.

## 5. Monorepo architecture

Create a TypeScript monorepo using pnpm workspaces and Turborepo.

Use an architecture similar to:

- apps/mobile — Expo React Native application
- apps/web — Next.js application
- packages/core — framework-independent domain logic
- packages/types — shared TypeScript types
- packages/validation — shared validation schemas
- packages/recommendations — recommendation and ranking engine
- packages/database — database types, clients, and repository contracts
- packages/recipe-providers — external provider interfaces and adapters
- packages/recipe-import — ingestion, normalization, validation, and deduplication
- packages/i18n — localization configuration and translations
- packages/config — shared linting, TypeScript, and build configuration
- supabase/migrations — versioned database migrations
- supabase/functions — server-side or Edge Function integrations where useful
- supabase/seed.sql — safe development seed data
- docs — architecture, security, data sourcing, backup, and deployment documentation

Keep business logic independent from React, React Native, Next.js, and Supabase whenever practical.

Do not create oversized screen components. Organize functionality by domain feature and use clear repository and service boundaries.

## 6. Technical stack

Use current stable and mutually compatible versions.

### Mobile

Use:

- Expo
- React Native
- TypeScript with strict mode
- Expo Router
- TanStack Query
- AsyncStorage for appropriate local persistence
- Expo-compatible secure storage for authentication tokens
- A lightweight state solution only where server state and local component state are insufficient
- Expo Notifications for optional local reminders
- Expo Network or an equivalent maintained connectivity mechanism
- EAS configuration for future store builds

The mobile application must run in Expo during development and support production builds for iOS and Android.

### Web

Use:

- Next.js with App Router
- TypeScript with strict mode
- Tailwind CSS
- A maintained, accessible component system
- Server Components by default where appropriate
- Client Components only where interaction requires them
- TanStack Query where client-side server-state handling is useful
- Progressive Web App support
- Responsive and accessible layouts
- Public SEO pages and private authenticated application pages

The web application must be a complete version of Emrooz, not merely a marketing page or mobile download page.

### Backend

Use Supabase for:

- PostgreSQL
- Authentication
- Row Level Security
- Recipe image storage
- User-specific data synchronization
- Server-side functions where appropriate

Use Next.js server routes or Supabase Edge Functions for third-party recipe provider calls. Never expose provider secrets or service-role credentials to mobile or browser clients.

### Validation and quality tooling

Use:

- Shared runtime validation schemas
- ESLint
- Prettier
- Unit testing
- Component testing
- Web end-to-end testing with Playwright or a comparable maintained tool
- Mobile integration or component testing suitable for Expo
- GitHub Actions

## 7. Local development and demo mode

The repository must run without production credentials.

Provide:

- A local demo mode
- A small bundled, legally safe recipe dataset
- Local guest preferences, pantry, favorites, history, planner, and shopping list
- Clear environment examples
- Local Supabase instructions

When Supabase credentials are missing, the UI must not crash. It must enter demo mode and clearly indicate this only where useful to developers.

Do not place real secrets in source control.

## 8. Branding and design system

Create a warm, modern, calm, and premium visual identity.

Initial palette:

- Warm saffron: #F4A261
- Deep green: #254D32
- Cream: #FFF8ED
- Charcoal: #222222
- White cards
- Warm muted gray for secondary content
- Accessible success, warning, and error colors

Use:

- Rounded cards
- Generous spacing
- Clear hierarchy
- Large touch targets
- Strong readable contrast
- Warm food-focused imagery
- Graceful local placeholders when images are unavailable
- Skeleton loading states
- Helpful empty states
- Subtle, purposeful animation

Avoid:

- A generic dashboard appearance
- Excessive gradients
- Tiny text
- Text embedded inside important images
- Culturally stereotypical decoration
- Layouts that work only on large phones

Create centralized design tokens for color, spacing, radius, shadows, typography, and motion. Prepare dark-mode support even if light mode is the initial default.

Create placeholder app icon, splash screen, social preview, and favicon assets that can later be replaced by professional brand assets.

## 9. Accessibility

Meet practical WCAG 2.2 AA expectations where applicable.

Include:

- Accessible labels
- Logical heading hierarchy
- Keyboard navigation on web
- Visible focus states
- Screen-reader-friendly controls
- Sufficient contrast
- Large touch targets
- Reduced-motion support
- Dynamic text resilience
- Form error descriptions
- No information communicated only through color

## 10. Localization

Support:

- English
- German
- Dari
- Pashto

Requirements:

- Language selection during onboarding
- Language selection in settings
- No user-facing text hard-coded in components
- Feature-organized translation resources
- Persisted locale
- Locale-aware dates and numbers
- Right-to-left layouts for Dari and Pashto
- Mirrored navigation and directional icons where appropriate
- Recipe titles and alternative spellings per language

Draft translations may be included but must be easy to review. Mark translations that require native-speaker verification.

## 11. Authentication and guest mode

Support:

- Guest use without registration
- Email and password registration
- Email and password sign-in
- Magic-link authentication
- Email verification
- Forgot-password and reset-password flow
- Sign out
- Session restoration
- Account deletion
- Personal-data export

Guest users must be able to:

- Complete onboarding
- Receive recommendations
- Use a pantry
- Favorite recipes
- Record cooking history
- Create a meal plan
- Maintain a shopping list

When a guest creates an account, safely merge local data into the new cloud account. Make the merge idempotent and test it.

Prepare clean extension points for Apple and Google login, but they are not required for Version 1.

## 12. Mobile application

Create bottom navigation with:

1. Today
2. Discover
3. Pantry
4. Planner
5. Favorites

Access cooking history, account, settings, language, notifications, data export, and account deletion through a profile/settings area.

Use native-feeling navigation, safe areas, keyboard avoidance, appropriate loading states, and pull-to-refresh where useful.

## 13. Complete web application

The web application at emroozapp.com must provide the same core functionality as mobile.

It must include:

- A public landing page
- Public recipe pages
- A complete guest experience
- A complete authenticated experience
- Responsive mobile, tablet, laptop, and desktop layouts
- Progressive Web App installation
- Administration tools

Create routes similar to:

- /
- /app
- /discover
- /cuisines/afghan
- /cuisines/[slug]
- /recipes/[slug]
- /pantry
- /planner
- /shopping-list
- /favorites
- /history
- /settings
- /auth/sign-in
- /auth/sign-up
- /auth/forgot-password
- /privacy
- /terms
- /imprint
- /admin
- /admin/recipes
- /admin/recipes/[id]
- /admin/ingredients
- /admin/imports
- /admin/imports/[id]
- /admin/providers
- /admin/review

Private user pages must not be indexed.

Public pages must have:

- Useful titles and descriptions
- Canonical URLs
- Open Graph metadata
- Sitemap
- Robots configuration
- Recipe JSON-LD where valid
- Cuisine landing-page metadata
- Print-friendly recipe layouts

Do not invent legal-owner names, addresses, registration numbers, or contact information. Create clearly marked placeholders for privacy, terms, and imprint details that must be supplied before release.

## 14. Public landing page

Create a polished landing page containing:

- Emrooz branding
- The tagline “What should I cook today?”
- A concise value proposition presenting Emrooz as a global personal cooking assistant
- Example recommendations spanning several cuisines (not only Afghan)
- International cuisine coverage as the primary positioning
- A curated Afghan-cuisine section presented as one of several featured collections, not as the app's identity
- Pantry-based suggestions
- Meal-planning explanation
- Mobile and web preview sections
- Clear calls to action
- Frequently asked questions
- Footer with legal and support links

The hero section, screenshots, and copy must communicate a worldwide product. Afghan content may be featured, but must never dominate the landing page to the point that a visitor mistakes Emrooz for a regional or ethnic-food-only app.

Do not let the marketing page block direct entry into the usable web application.

## 15. Onboarding

Collect:

- Preferred language
- Preferred cuisines
- Household size
- Usual maximum cooking time
- Dietary requirements
- Allergies
- Disliked ingredients
- Common pantry ingredients
- Cooking skill or preferred difficulty
- Optional daily cooking-reminder time

Include Halal as a dietary preference.

Users may skip non-safety questions and change answers later. Allergies and strict dietary restrictions must never be treated as optional ranking preferences.

## 16. Today experience

The Today screen is the heart of Emrooz.

Show:

- Friendly greeting
- “What should I cook today?”
- Three personalized recipe recommendations
- Image or attractive fallback
- Recipe name
- Cuisine and region
- Preparation and total time
- Difficulty
- Pantry match percentage
- Missing ingredient count
- Short human-readable recommendation reason
- Favorite action
- Cook this action
- Show me another action
- Add to planner action
- Add missing ingredients action

Provide quick filters:

- 20 minutes
- 30 minutes
- 45 minutes
- 60+ minutes
- Quick meal
- Vegetarian
- Use what I have
- Family friendly
- Surprise me
- Dynamic cuisine chips: a rotating short list of cuisines derived from the database (weighted by the user's preferences and by content availability). No single cuisine — including Afghan — may be hard-coded as a permanent quick filter. If a user selects Afghan as a preferred cuisine it may appear as a chip on the same terms as any other preferred cuisine.

The daily set must remain stable during the same local calendar day unless the user explicitly refreshes it.

## 17. Recommendation engine

Implement the recommendation engine as a framework-independent shared package used by mobile and web.

Do not use random selection alone.

### Hard filters

Always exclude:

- Allergens selected by the user
- Recipes incompatible with strict dietary requirements
- Disliked ingredients when configured as exclusions
- Recipes exceeding an explicit maximum time
- Unpublished recipes
- Rejected or archived recipes
- Recipes with insufficient dietary-safety data when a strict restriction requires certainty

Never relax allergy or dietary-safety rules to produce more results.

### Scoring

Use an explainable initial weighting close to:

- 40 percent pantry ingredient match
- 25 percent cuisine and preference match
- 20 percent cooking-history diversity
- 15 percent available-time fit

Also consider:

- Favorites
- “Not today” feedback
- Household size
- Difficulty preference
- Meal type
- Recent recommendation exposure
- Recent cooking
- Small deterministic daily variation

Use a stable user-and-date seed for the daily variation.

Return:

- Final score
- Score components
- User-facing explanation
- Missing ingredients
- Safety-filter result

### Required tests

Test:

- Allergy exclusion
- Dietary restriction exclusion
- Disliked ingredient exclusion
- Time filtering
- Pantry matching
- Cuisine preference
- Recent-history penalty
- Favorite influence
- Stable same-day results
- Different-day variation
- Guest recommendations
- No-result behavior
- Missing dietary metadata

## 18. Discover

Allow users to:

- Search recipes by name
- Search by ingredient
- Browse by cuisine
- Browse by country or region
- Filter by time
- Filter by difficulty
- Filter by meal type
- Filter by dietary tags
- Filter by pantry match
- Sort by relevance
- Sort by time
- Sort by pantry match
- Clear filters

Present a globally varied browsing experience. Featured cuisine sections must rotate across all supported cuisines based on content depth and the user's stated preferences — no cuisine may be permanently pinned or hard-coded as the "primary" feature. Afghan cuisine may appear in the rotation on the same terms as any other, and should surface prominently only for users who explicitly express interest in it or for anonymous visitors landing on the Afghan cuisine page directly.

Implement pagination or progressive loading and helpful empty states.

## 19. Pantry

Allow users to:

- Search ingredients
- Add and remove ingredients
- Select common ingredients as chips
- Group ingredients by category
- Store optional quantities
- Clear the pantry
- See how many recipes can be made
- See recipes needing only one or two additional ingredients

Normalize aliases and spelling so equivalent ingredients match.

Examples:

- Aubergine, eggplant, and brinjal
- Coriander and cilantro
- Chickpeas and garbanzo beans
- Courgette and zucchini
- Minced meat and ground meat

Persist locally for guests and synchronize for registered users.

## 20. Recipe details

Each recipe page must include:

- Localized title
- Alternative names
- Description
- Cuisine
- Country and region
- Preparation time
- Cooking time
- Total time
- Difficulty
- Meal types
- Serving count
- Adjustable servings
- Scaled ingredient quantities
- Pantry ingredients clearly identified
- Missing ingredients clearly identified
- Ordered cooking instructions
- Dietary tags
- Allergen information
- Source and attribution where required
- Favorite action
- I cooked this action
- Add to planner
- Add missing ingredients to shopping list
- Share action
- Report a problem action
- Print action on web

When a user records cooking, store the recipe, date, serving count, and optional private note.

## 21. Favorites, feedback, and history

Favorites must synchronize across mobile and web.

Cooking history must support:

- Recipe
- Date cooked
- Serving count
- Private note
- Cook again
- Add to planner
- Remove history entry

Capture private recommendation feedback:

- Looks good
- Not today
- I do not like this
- Too difficult
- Takes too long

Use feedback to improve ranking. Do not expose private feedback publicly.

## 22. Weekly meal planner

Allow users to:

- Navigate between weeks
- Assign recipes to a day
- Choose breakfast, lunch, or dinner
- Replace a planned recipe
- Remove a planned recipe
- Copy a previous week
- Generate a suggested week
- Avoid unnecessary repetition
- Respect preferences and dietary restrictions
- Add a week’s missing ingredients to the shopping list

Persist and synchronize the plan.

## 23. Shopping list

Support:

- Automatically adding missing recipe ingredients
- Manually adding items
- Ingredient categories
- Quantity and unit
- Combining compatible duplicates
- Tracking which recipes added an item
- Checking items off
- Editing items
- Clearing completed items
- Clearing the entire list with confirmation

Persist locally for guests and synchronize for registered users.

## 24. Notifications

On mobile, support an optional local daily reminder such as:

“Not sure what to cook? Emrooz has today’s ideas ready.”

Requirements:

- Ask permission only after the user enables the feature.
- Allow selecting a reminder time.
- Allow disabling it.
- Respect the device timezone.
- Do not require remote push infrastructure for Version 1.

## 25. Data ownership principle

Emrooz must continue operating if every external recipe provider becomes unavailable.

The Emrooz PostgreSQL database is the application source of truth.

Normal data flow:

1. Retrieve content through an authorized source.
2. Confirm storage, modification, image, and commercial permissions.
3. Record provenance and license information.
4. Import into a restricted staging area.
5. Normalize ingredients, measurements, cuisines, and tags.
6. Detect duplicates.
7. Validate the record.
8. Review it through the administration interface.
9. Publish it into the Emrooz database.
10. Serve it to mobile and web from Emrooz-controlled infrastructure.
11. Back it up independently.

External providers are ingestion or enrichment sources, not the runtime source of truth.

## 26. Primary online recipe provider

Use TheMealDB as the initial online import provider.

Official resources:

- API documentation: https://www.themealdb.com/api.php
- Terms: https://www.themealdb.com/terms_of_use.php

The terms were last reviewed for this specification on 2026-09-02. Recheck them during implementation and again before public release.

At the time of this specification, TheMealDB permits copying and modifying content returned through official API endpoints, while requiring appropriate source treatment. Public app-store use requires a paid subscription.

Rules:

- Use only official API endpoints.
- Do not scrape the website.
- Preserve attribution and source metadata.
- Use the test key only for development.
- Require a production supporter key before app-store release.
- Respect rate limits.
- Store only content permitted by the current terms.
- Make removal of provider content possible.

Environment variable:

- THEMEALDB_API_KEY

Implement commands such as:

- pnpm recipes:import --provider themealdb --area Afghan
- pnpm recipes:import --provider themealdb --area Italian
- pnpm recipes:sync --provider themealdb
- pnpm recipes:validate
- pnpm recipes:export

## 27. Optional providers

Create replaceable adapters for other providers, but do not make them mandatory.

### Spoonacular

It may be used for optional live search or enrichment when permitted by its current contract.

Do not store full Spoonacular ingredients, instructions, or nutrition data without explicit written permission. Its standard terms restrict persistent storage of most returned content.

Environment variable:

- SPOONACULAR_API_KEY

### Edamam

It may be used for optional user-initiated search and external recipe links.

Do not bulk collect Edamam recipes. Do not store restricted content or instructions. Standard web recipes generally link to the original source for instructions, and caching is limited by plan and contract.

Environment variables:

- EDAMAM_APP_ID
- EDAMAM_APP_KEY

The app must work fully when both optional providers are disabled.

Never assume that paying for an API automatically grants permanent storage rights.

## 28. Provider abstraction

Define a provider interface supporting:

- Search
- Fetch by provider ID
- Fetch by cuisine or area
- Pagination
- Rate-limit metadata
- Mapping to a canonical import candidate
- Attribution data
- License and storage mode
- Synchronization
- Provider health check
- Removal handling

Provider-specific response shapes must not leak into screens or the core domain model.

## 29. Launch content strategy — Afghan as the flagship collection

Emrooz is a global app. The launch content strategy is to ship with broad international coverage plus one exceptionally well-curated cuisine collection as a proof of quality — that flagship collection is Afghan cuisine, chosen because it is currently underserved by mainstream cooking apps.

This means at launch:

- Every supported cuisine must have working, published recipes — not empty categories.
- Afghan is the deepest and most carefully reviewed collection, but it is one collection among many, not the whole product.
- Discover, Today, search, and browse must always show a genuine international mix by default. A user who does not select Afghan as a preference must rarely, if ever, be steered toward Afghan content.
- The Afghan collection must never be surfaced by hard-coded rules in application code. Its prominence comes only from having more published, high-quality recipes in the database — the same mechanism any other cuisine can benefit from as it grows.

Public APIs alone are not sufficient for the Afghan flagship collection. Build an Emrooz-owned Afghan collection using:

- Family recipes
- Recipes supplied with explicit permission
- Afghan cooks
- Community contributors
- Public-domain material
- Appropriately licensed sources
- Content written and reviewed specifically for Emrooz

Create at least 40 structured Afghan draft recipes or review candidates before launch, with a meaningful selection published only after review.

In parallel, ship a broad international baseline so the app is genuinely usable worldwide from day one. At minimum, publish at least 10–15 reviewed recipes per launch cuisine listed in section 30, covering common meal types, dietary tags (vegetarian, vegan, halal, gluten-free where realistic), and cooking-time buckets. Empty or near-empty cuisines are not acceptable at launch.

Cover:

- Palaw and chalaw
- Qorma
- Dumplings
- Bread and bolani
- Soup
- Legume dishes
- Vegetable dishes
- Meat dishes
- Breakfast
- Desserts
- Drinks
- Everyday meals
- Regional meals
- Celebration meals

Candidate dishes include:

- Qabuli Palaw
- Mantu
- Ashak
- Bolani
- Bolani Kadu
- Sabzi Chalaw
- Shola
- Shorwa
- Qorma Sabzi
- Qorma-e-Lubia
- Borani Banjan
- Kadu Borani
- Kofta
- Chapli Kebab
- Chopan Kebab
- Afghan Naan
- Mastawa
- Aush
- Firni
- Sheer Yakh
- Haft Mewa
- Gosh-e-Feel
- Sambosa
- Afghan salad
- Afghan chai

Support regional and household variations. Never claim that one version is the only authentic version.

Add editorial states:

- Draft
- Imported
- Needs review
- Reviewed
- Published
- Rejected
- Archived

Add authenticity-review states:

- Unreviewed
- Family reviewed
- Community reviewed
- Expert reviewed

Only reviewed, published recipes may appear in ordinary recommendations.

## 30. International expansion

Model country, cuisine, and region separately.

A recipe may have:

- One origin country
- One or more cuisine associations
- One or more regions
- Multiple localized names
- Multiple dietary tags

Launch cuisines — Version 1 must ship with genuine, published recipe coverage for all of the following, not just Afghan:

- Afghan (flagship curated collection per section 29)
- Iranian
- Turkish
- Pakistani
- Indian
- Central Asian
- Arab and Middle Eastern
- Italian
- French
- Spanish
- Austrian
- German
- Greek
- British
- Chinese
- Japanese
- Korean
- Thai
- Vietnamese
- Mexican
- Brazilian
- North African
- West African
- East African
- American
- Other European cuisines

Do not hard-code available cuisines into application screens. Read them from the database. Adding a new cuisine after Version 1 must require only data changes — no code changes to the app, the recommendation engine, discover screens, or admin tools.

## 31. Licensing and provenance

Never scrape arbitrary recipe websites.

Before integrating a source:

- Review its current API terms.
- Confirm commercial use.
- Confirm persistent storage permission.
- Confirm modification permission.
- Confirm caching limits.
- Confirm image rights.
- Confirm attribution requirements.
- Confirm deletion obligations.
- Confirm quotas and rate limits.
- Record the review date and terms URL.

If rights are unclear, exclude the source or use an external-link-only model.

Do not copy instructions from blogs, cookbooks, videos, social posts, or search results without permission.

Add provenance fields such as:

- content_owner
- ownership_type
- source_provider
- source_recipe_id
- source_url
- source_terms_url
- source_terms_version
- source_license
- source_license_url
- attribution_text
- attribution_url
- storage_permission
- image_storage_permission
- imported_at
- last_synced_at
- content_hash

Ownership types:

- emrooz_owned
- licensed
- open_license
- provider_hosted
- external_link_only

Storage permission types:

- permanent
- subscription_only
- temporary_cache
- metadata_only
- not_permitted

## 32. Import pipeline

Implement:

1. Provider fetch
2. Restricted raw staging
3. Canonical mapping
4. Ingredient normalization
5. Unit normalization
6. Duplicate detection
7. Schema validation
8. License validation
9. Admin review
10. Publication

Support:

- Manual administration imports
- CLI imports
- Scheduled synchronization
- Idempotency
- Pagination
- Rate limiting
- Retry with exponential backoff
- Import progress
- Partial failures
- Audit logs
- Provider record updates
- Safe provider record removal

Never auto-publish imported content.

## 33. Duplicate detection

Detect duplicates using:

- Provider plus external ID
- Source URL
- Normalized title
- Country and cuisine
- Main ingredients
- Content fingerprint

Flag uncertain matches for human review. Do not automatically merge uncertain content.

## 34. Ingredient normalization

Create a canonical ingredient catalogue with:

- Canonical English name
- German name
- Dari name
- Pashto name
- Alternative spellings
- Singular and plural forms
- Ingredient category
- Common units
- Allergen data
- Dietary compatibility

Never classify a recipe as Halal merely because it comes from a Muslim-majority country. Determine compatibility from reviewed ingredients and preparation data. Use unknown when certainty is not possible.

Allergy filtering must be conservative and clearly presented as informational support, not a medical guarantee.

## 35. Database model

Create versioned Supabase migrations for at least:

- profiles
- user_preferences
- countries
- regions
- cuisines
- recipes
- recipe_versions
- recipe_translations
- recipe_steps
- recipe_step_translations
- ingredients
- ingredient_translations
- ingredient_aliases
- recipe_ingredients
- dietary_tags
- recipe_dietary_tags
- allergens
- ingredient_allergens
- recipe_allergens
- favorites
- pantry_items
- cooking_history
- recommendation_feedback
- recommendation_impressions
- meal_plan_entries
- shopping_list_items
- providers
- provider_terms_reviews
- import_batches
- import_candidates
- import_errors
- media_assets

Include:

- UUID primary keys
- Foreign keys
- Useful indexes
- Created and updated timestamps
- Soft deletion where editorial recovery is needed
- Uniqueness constraints
- Publication status
- Audit fields
- Database constraints for important invariants

Avoid storing important structured values as unvalidated free text.

Generate or maintain compatible TypeScript database types.

## 36. Recipe version history

Whenever a published recipe changes, preserve:

- Version number
- Previous content
- Editor
- Timestamp
- Change reason
- Source
- Review status

Administrators must be able to compare versions and restore an earlier version.

## 37. Row Level Security

Apply Row Level Security to every relevant table.

Rules must ensure:

- Anyone may read published public recipes.
- Draft, rejected, and archived recipes are not public.
- Users may access only their own preferences and private data.
- Users may access only their own pantry, favorites, history, feedback, planner, and shopping list.
- Only authorized administrators may manage recipe content and providers.
- Only authorized reviewers may approve content.
- Provider staging responses are never public.
- Service-role keys remain server-side.

Test important RLS policies.

Do not rely on hidden buttons or client-side role checks for security.

## 38. Image storage

Use Supabase Storage for Emrooz-owned and legally storable recipe images.

For every media asset, store:

- Original source
- Creator
- License
- License URL
- Attribution
- Import date
- Checksum
- Related recipe
- Storage permission

Do not copy an image unless its rights permit storage and use.

Do not depend on remote image URLs. Use Emrooz placeholders when no permitted image exists.

If Wikimedia Commons is used, check the license of each individual file and preserve its attribution. Do not assume that all files share one license.

## 39. Offline behavior and synchronization

Mobile must remain useful without a reliable connection.

Implement:

- Bundled minimum recipe collection
- Cached published recipes
- Persisted query cache
- Local guest data
- Offline pantry, favorites, history, planner, and shopping list
- Optimistic updates where safe
- Synchronization when connectivity returns
- Retry behavior
- Clear but non-intrusive offline state
- Idempotent writes
- A documented conflict policy

Use last-write-wins only where appropriate. Avoid silent destructive merges.

The web PWA should cache the application shell and handle offline conditions gracefully.

## 40. Administration

Create a protected web administration area.

Administrators must be able to:

- Create and edit recipes
- Save drafts
- Publish and unpublish
- Archive
- Restore versions
- Upload and manage images
- Manage ingredients and aliases
- Manage allergens and dietary tags
- Manage cuisines, countries, and regions
- Add translations
- Preview recipes
- Search and filter content
- Review import candidates
- Compare duplicates
- Correct normalized ingredients
- Inspect source rights and attribution
- Approve or reject recipes
- Manage provider configuration
- Test provider connectivity
- View import status and errors
- View audit history

Recipe editing must support structured ingredients and reorderable steps.

## 41. Provider administration

Administrators must be able to:

- Enable or disable a provider
- Configure non-secret provider behavior
- See whether required environment credentials exist
- Run health checks
- Search a provider
- Import selected records
- Import by cuisine
- View rate-limit information
- View the terms-review record
- Disable imports if terms have not been reviewed
- Remove or convert content when provider rights change

Do not display secret values.

## 42. Backup and disaster recovery

Implement defense in depth:

1. Supabase managed backups in production.
2. Automated logical PostgreSQL dumps.
3. Encrypted off-site backup storage separate from the main Supabase project.
4. Separate backup of Supabase Storage files.
5. Version-controlled migrations.
6. Portable JSON export of Emrooz-owned and permanently licensed recipes.
7. Documented restoration procedures.
8. Backup-failure monitoring.
9. Periodic restore tests.

Recommended policy:

- Daily database backup
- Weekly full recipe and media export
- Monthly long-term snapshot
- At least one backup with a separate provider

Remember that a database backup does not contain the actual Supabase Storage file bytes. Back up database data and media separately.

Never commit production data, personal user data, credentials, or unencrypted backups to Git.

## 43. Data portability

Create a provider-neutral JSON export format containing:

- Recipes
- Versions
- Translations
- Ingredients
- Aliases
- Recipe ingredients
- Instructions
- Cuisine and region metadata
- Dietary and allergen data
- Provenance
- Attribution
- License data
- Media metadata

Provide documented export, validation, and restore commands.

Emrooz must be capable of moving from Supabase to another PostgreSQL provider without rewriting mobile and web business logic.

## 44. Provider failure behavior

If every external provider is unavailable:

- Existing recipes remain available.
- Today recommendations continue working.
- Discover searches the internal database.
- Pantry matching continues working.
- Favorites, history, planner, and shopping list work.
- Mobile offline mode works.
- Only new imports and provider enrichment are unavailable.
- Administrators see provider health errors.
- Ordinary users are not shown irrelevant provider errors.

Add an automated test or integration scenario proving the core application works with all providers disabled.

## 45. Privacy and security

Apply privacy by design.

Requirements:

- Collect only necessary personal information.
- Keep allergy, preference, and history data private.
- Validate all input server-side.
- Apply authorization server-side.
- Rate-limit sensitive endpoints.
- Protect authentication flows.
- Never log secrets or sensitive personal data.
- Use secure headers on web.
- Prevent common injection and cross-site vulnerabilities.
- Validate file uploads.
- Restrict image MIME types and sizes.
- Provide account deletion.
- Provide personal-data export.
- Document data retention.
- Prepare privacy and consent behavior appropriate for an EU launch.

Do not add analytics, advertising trackers, or nonessential cookies in Version 1.

## 46. Environment variables

Create a documented .env.example containing placeholders for:

- Public Supabase URL
- Public Supabase anonymous key
- Server-only Supabase service-role key
- TheMealDB API key
- Optional Spoonacular API key
- Optional Edamam application ID
- Optional Edamam application key
- Application base URL
- Canonical domain
- Backup destination settings

Clearly identify which variables are:

- Public
- Mobile-safe
- Browser-safe
- Server-only
- Production-only

## 47. Seed and demo content

Provide a small legally safe dataset so automated tests and local demo mode work without provider access.

The demo dataset must be:

- Original
- Public domain
- Appropriately licensed
- Or clearly synthetic test content

Do not fabricate cultural authority. Mark unreviewed recipes as demo or draft content.

Include enough variety to test:

- Multiple international cuisines from at least three continents (Europe, Asia, Americas at minimum; ideally also Africa and Middle East)
- Afghan cuisine as one of those cuisines, not as the majority of the seed
- Vegetarian
- Vegan
- Meat
- Seafood
- Common allergens (nuts, dairy, gluten, eggs, shellfish)
- Halal, kosher, gluten-free, and dairy-free dietary tags
- Quick meals (under 20 minutes)
- Medium meals
- Long meals
- Pantry matching
- Multiple serving sizes

The demo seed must not be Afghan-dominated. A developer or reviewer running the app fresh must immediately see a globally varied experience.

## 48. Testing

Add:

- Domain unit tests
- Recommendation tests
- Ingredient-normalization tests
- Unit-scaling tests
- Import mapping tests
- Deduplication tests
- Licensing-rule tests
- Repository tests
- RLS tests where practical
- Mobile component tests
- Web component tests
- Web end-to-end tests
- Offline and synchronization tests

Test essential user flows:

1. Complete onboarding.
2. Continue as a guest.
3. Receive safe daily recommendations.
4. Add pantry ingredients.
5. Find pantry-matched recipes.
6. Open a recipe.
7. Adjust servings.
8. Mark a recipe as cooked.
9. Favorite a recipe.
10. Create a weekly plan.
11. Generate a shopping list.
12. Register after guest use.
13. See guest data after account creation.
14. Sign in on web and see synchronized data.
15. Use the mobile app offline.
16. Recover synchronization after reconnection.
17. Import a recipe.
18. Review and publish a recipe.
19. Verify unpublished content is not public.
20. Run the app with every external provider disabled.

## 49. Continuous integration

Create GitHub Actions workflows that run:

- Dependency installation
- Formatting check
- Linting
- Type checking
- Unit tests
- Integration tests that do not require production secrets
- Web production build
- Expo project validation
- Migration validation

Pull-request checks must not require production credentials.

## 50. Performance

Implement:

- Paginated recipe queries
- Indexed search fields
- Optimized images
- Lazy loading
- Query caching
- Avoidance of unnecessary re-renders
- Server rendering for useful public web content
- Reasonable mobile bundle size
- No repeated provider calls from clients

Measure before adding unnecessary complexity.

## 51. Error handling and observability

Add:

- Error boundaries
- User-friendly errors
- Structured server logs
- Import audit logs
- Provider health status
- Backup-job status
- Retryable versus permanent error classification
- No secrets in logs

Keep observability vendor-neutral for Version 1.

## 52. Domain and web deployment

Prepare the web application for emroozapp.com.

Requirements:

- emroozapp.com is canonical.
- www.emroozapp.com redirects to emroozapp.com.
- HTTPS is required.
- Environment configuration is documented.
- Sitemap and robots behavior are correct.
- Authentication redirect URLs are documented.
- Public and private routes are clearly separated.

Do not deploy or alter DNS without explicit authorization and credentials.

## 53. Mobile deployment

Configure:

- App display name: Emrooz
- Custom URL scheme: emrooz://
- Universal/app-link preparation for emroozapp.com
- Placeholder iOS bundle identifier using a documented value
- Placeholder Android package identifier using a documented value
- EAS build profiles for development, preview, and production
- Environment handling
- App icon and splash placeholders

Create release checklists for:

- Apple App Store
- Google Play Store
- TheMealDB production subscription requirement
- Privacy information
- Screenshots
- App description
- Support URL
- Account deletion

Do not submit builds externally without explicit authorization.

## 54. Documentation

Create a complete root README covering:

- Product overview
- Architecture
- Repository structure
- Prerequisites
- Installation
- Environment setup
- Demo mode
- Local Supabase
- Migrations
- Seed data
- Mobile development
- Web development
- Testing
- Provider configuration
- Recipe imports
- Licensing responsibilities
- Afghan review workflow
- Backup setup
- Restore procedure
- Production web build
- EAS mobile builds
- Deployment overview
- Known limitations

Also create:

- docs/architecture.md
- docs/data-model.md
- docs/recommendation-engine.md
- docs/recipe-sourcing-and-licensing.md
- docs/afghan-content-review.md
- docs/offline-and-sync.md
- docs/security-and-privacy.md
- docs/backup-and-restore.md
- docs/web-deployment.md
- docs/mobile-release.md

## 55. Required commands

Provide convenient root commands equivalent to:

- pnpm install
- pnpm dev
- pnpm dev:web
- pnpm dev:mobile
- pnpm lint
- pnpm format:check
- pnpm typecheck
- pnpm test
- pnpm test:e2e
- pnpm build
- pnpm build:web
- pnpm supabase:start
- pnpm supabase:reset
- pnpm recipes:import
- pnpm recipes:validate
- pnpm recipes:export
- pnpm backup:database
- pnpm backup:media

Use platform-independent Node scripts where shell portability would otherwise become a problem.

## 56. Definition of done

The work is complete only when:

- The mobile application runs through Expo.
- iOS and Android builds are structurally configured.
- The complete web application runs locally.
- The web production build succeeds.
- Guest mode works without Supabase.
- Supabase mode works when configured.
- Authentication works.
- Guest-to-account migration works.
- User data synchronizes across mobile and web.
- The Today recommendation engine works.
- Dietary and allergy hard filters work.
- Pantry matching works.
- Discover works.
- Recipe details and serving adjustment work.
- Favorites and cooking history work.
- Weekly planning works.
- Shopping lists work.
- Local reminders work on supported mobile environments.
- Afghan cuisine is prominently represented.
- Recipe imports use a provider abstraction.
- TheMealDB integration works when configured.
- The app works with external providers disabled.
- Imported recipes require review before publication.
- Administration tools work.
- Database migrations exist.
- Row Level Security policies exist.
- Offline behavior is implemented.
- Backup and restore procedures exist.
- Tests pass.
- Linting passes.
- Type checking passes.
- CI exists.
- Documentation is complete.

## 57. Execution method

Follow this process:

1. Inspect the existing repository and environment.
2. State a concise implementation plan and proposed structure.
3. Initialize the monorepo if needed.
4. Implement in small, verifiable phases.
5. Run relevant checks after each phase.
6. Fix errors before proceeding.
7. Keep a short implementation checklist updated.
8. Do not discard unrelated existing user changes.
9. Do not stop after creating placeholders.
10. Do not claim success without running the available checks.

If the full implementation cannot fit into one working session, leave the repository in a running, tested state, document exactly what remains, and continue with the next unfinished phase when instructed. Do not silently reduce the scope.

## 58. Final handoff

At completion, provide:

- Concise summary of what was built
- Final architecture
- Important directories
- How to run mobile
- How to run web
- How to start local Supabase
- How to configure provider keys
- How to import Afghan recipes
- How to access the admin area
- How to run tests
- Test, lint, type-check, and build results
- How backups work
- Remaining limitations
- Exact next steps for web deployment
- Exact next steps for iOS and Android release

Build Emrooz as a durable, attractive, Afghan-first and internationally extensible cooking platform centered on one daily question:

What should I cook today?

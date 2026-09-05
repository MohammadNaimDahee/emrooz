#!/usr/bin/env node
/**
 * Wikipedia-first dish importer with Wikidata enrichment.
 *
 * Primary source: the Wikipedia category system.
 *   Category:Afghan_cuisine → 57 pages
 *   Category:Indian_cuisine → hundreds
 * These are curated by Wikipedia editors and are the closest thing to a
 * canonical dish index that exists on the free-and-open web.
 *
 * Secondary source: Wikidata (via the QID that Wikipedia links to).
 *   Gives us structured "has ingredient" (P527) and country of origin.
 *
 * How it works:
 *   1. Recursively walk the cuisine's Wikipedia category (depth 2 max).
 *   2. Filter obvious non-dishes (meta articles, restaurants, chef bios,
 *      subcategory pages).
 *   3. For each dish page, fetch:
 *        - plain-text intro extract (MediaWiki `prop=extracts&exintro`)
 *        - Wikidata Q-ID (via `prop=pageprops`)
 *   4. For each Q-ID, fetch structured ingredients from Wikidata.
 *   5. Upsert into Supabase with full provenance:
 *        content_owner       = 'Wikipedia contributors'
 *        ownership_type      = 'licensed'
 *        source_provider     = 'wikipedia'
 *        source_recipe_id    = Wikidata Q-ID (or Wikipedia title fallback)
 *        source_url          = Wikipedia article URL
 *        source_license      = 'CC BY-SA 4.0'
 *        attribution_text    = 'Wikipedia contributors, CC BY-SA 4.0'
 *        editorial_state     = 'draft' (or 'published' with --publish)
 *        authenticity_review = 'unreviewed'
 *
 * Idempotent — upserts by source_recipe_id (Q-ID). Re-running refreshes
 * descriptions but doesn't duplicate rows.
 *
 * Env: SUPABASE_URL, SUPABASE_SECRET_KEY.
 * Args:
 *   --cuisine <slug>   afghan, indian, pakistani, etc (see CUISINE_CATEGORIES)
 *   --publish          set editorial_state='published' (local dev use)
 *   --depth <n>        category recursion depth (default 1)
 *   --limit <n>        max dishes per run (default 200)
 */
import { createClient } from '@supabase/supabase-js';

// ─── Configuration ──────────────────────────────────────────────────

/**
 * Emrooz cuisine slug → Wikipedia category title.
 * Add more entries here as you extend coverage.
 */
const CUISINE_CATEGORIES = {
  afghan: 'Category:Afghan_cuisine',
  indian: 'Category:Indian_cuisine',
  pakistani: 'Category:Pakistani_cuisine',
  bangladeshi: 'Category:Bangladeshi_cuisine',
  iranian: 'Category:Iranian_cuisine',
  turkish: 'Category:Turkish_cuisine',
  italian: 'Category:Italian_cuisine',
  french: 'Category:French_cuisine',
  spanish: 'Category:Spanish_cuisine',
  chinese: 'Category:Chinese_cuisine',
  japanese: 'Category:Japanese_cuisine',
  korean: 'Category:Korean_cuisine',
  thai: 'Category:Thai_cuisine',
  vietnamese: 'Category:Vietnamese_cuisine',
  mexican: 'Category:Mexican_cuisine',
  brazilian: 'Category:Brazilian_cuisine',
  german: 'Category:German_cuisine',
  austrian: 'Category:Austrian_cuisine',
  greek: 'Category:Greek_cuisine',
  british: 'Category:British_cuisine',
  american: 'Category:Cuisine_of_the_United_States',
  'north-african': 'Category:North_African_cuisine',
  'west-african': 'Category:West_African_cuisine',
  'east-african': 'Category:East_African_cuisine',
  arab: 'Category:Arab_cuisine',
  'central-asian': 'Category:Central_Asian_cuisine',
  portuguese: 'Category:Portuguese_cuisine',
  'indo-chinese': 'Category:Indian_Chinese_cuisine',
};

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const USER_AGENT = 'Emrooz-Importer/0.2 (https://emroozapp.com)';

// Pages that appear in cuisine categories but aren't individual dishes.
// The regex is deliberately conservative — false negatives (a real dish
// slipping through) are fine, the reviewer will sort. False positives
// (a non-dish being imported as a recipe) are more expensive.
const NON_DISH_PATTERNS = [
  /\bcuisine\b/i, // "Afghan cuisine", "Hazara cuisine"
  /\brestaurants?\b/i, // "Category:Restaurants in X"
  /\bchefs?\b/i, // "Category:Afghan chefs"
  /\brecipes?\b/i, // "Category:Traditional recipes"
  /\bfoods?\b(?!.*\S)/i, // literal "Foods" alone
  /\bkitchen\b/i, // "Khan Saab Desi Craft Kitchen"
  /\bRamadan\b/i, // "Ramadan in Afghanistan"
  /\bculture\b/i,
  /\bhistory\b/i,
  /\bList of\b/i,
  /^Category:/, // any subcategory (handled separately during walk)
];

function isNonDish(title) {
  return NON_DISH_PATTERNS.some((re) => re.test(title));
}

// ─── Heuristic enrichment ───────────────────────────────────────────
// Wikipedia gives us title + description + (sometimes) ingredients + image.
// It does NOT give machine-readable meal types, dietary flags, allergens,
// times, or step-by-step instructions. We derive plausible values from the
// text so the recipe row is useful immediately, then flag it as
// `authenticity_review='unreviewed'` so a native cook + editor can polish
// before app-store submission. This is the "AI generation" pass — pure
// heuristics, no external LLM call, so it runs offline for free.

/** Guess meal types from the description text. Multi-tag if several apply. */
function inferMealTypes(text) {
  const t = (text || '').toLowerCase();
  const tags = new Set();
  if (/dessert|sweet|pudding|halva|halwa|kheer|firni|ice cream|jalebi/.test(t)) tags.add('dessert');
  if (/breakfast|morning|paratha|pancake|omelett?e|porridge|congee/.test(t)) tags.add('breakfast');
  if (/soup|broth|stew|shorwa|chorba|aush\b/.test(t)) tags.add('soup');
  if (/salad|sabzi khordan|sabzi_khordan/.test(t)) tags.add('salad');
  if (/(street|snack|appetizer|starter|hors d'?oeuvre|finger food|samosa|bolani|kebab)/.test(t))
    tags.add('snack');
  if (/side dish|accompaniment|served with|chutney|raita|pickle|naan|bread\b/.test(t))
    tags.add('side');
  if (/dinner|main course|main dish|entree|entrée/.test(t)) tags.add('dinner');
  if (/(lunch)/.test(t)) tags.add('lunch');
  // Default: if nothing matched, assume it's a full meal.
  if (tags.size === 0) {
    tags.add('lunch');
    tags.add('dinner');
  }
  return [...tags];
}

/** Guess dietary tags from ingredient names + description. */
function inferDietaryTags(ingredients, description) {
  const text = ((description || '') + ' ' + ingredients.join(' ')).toLowerCase();
  const has = (patterns) => patterns.some((p) => new RegExp(`\\b${p}\\b`).test(text));

  const hasMeat = has(['beef', 'lamb', 'mutton', 'chicken', 'pork', 'goat', 'veal', 'duck', 'turkey', 'meat', 'bacon', 'sausage', 'ham', 'kebab', 'kabab', 'kofta', 'liver']);
  const hasFish = has(['fish', 'salmon', 'tuna', 'hilsa', 'anchovy', 'sardine', 'cod', 'trout', 'mackerel']);
  const hasShellfish = has(['shrimp', 'prawn', 'crab', 'lobster', 'squid', 'octopus', 'shellfish', 'mussels', 'clam', 'oyster']);
  const hasDairy = has(['milk', 'yogurt', 'yoghurt', 'cheese', 'butter', 'ghee', 'cream', 'paneer', 'khoya', 'mast', 'doogh', 'lassi', 'kefir']);
  const hasEgg = has(['egg', 'eggs']);
  const hasHoney = has(['honey']);
  const hasGluten = has(['flour', 'wheat', 'bread', 'naan', 'roti', 'paratha', 'noodles?', 'pasta', 'bulgur', 'semolina', 'barley', 'rye', 'couscous', 'phyllo', 'filo']);

  const tags = new Set();
  const isVegan = !hasMeat && !hasFish && !hasShellfish && !hasDairy && !hasEgg && !hasHoney;
  const isVegetarian = isVegan || (!hasMeat && !hasFish && !hasShellfish);
  if (isVegan) {
    tags.add('vegan');
    tags.add('vegetarian');
    tags.add('dairy_free');
    tags.add('egg_free');
  } else if (isVegetarian) {
    tags.add('vegetarian');
    if (!hasEgg) tags.add('egg_free');
    if (!hasDairy) tags.add('dairy_free');
  } else if (!hasMeat && (hasFish || hasShellfish)) {
    tags.add('pescatarian');
  }
  if (!hasGluten) tags.add('gluten_free');
  // Nut-free heuristic
  if (!has(['nut', 'almond', 'pistachio', 'cashew', 'walnut', 'hazelnut', 'pecan', 'peanut'])) {
    tags.add('nut_free');
  }
  return [...tags];
}

/** Infer allergen flags from ingredients + description. */
function inferAllergens(ingredients, description) {
  const text = ((description || '') + ' ' + ingredients.join(' ')).toLowerCase();
  const has = (patterns) => patterns.some((p) => new RegExp(`\\b${p}\\b`).test(text));
  const allergens = new Set();
  if (has(['flour', 'wheat', 'bread', 'naan', 'roti', 'paratha', 'noodles?', 'pasta', 'bulgur', 'semolina', 'barley', 'rye', 'couscous', 'phyllo', 'filo'])) allergens.add('gluten');
  if (has(['milk', 'yogurt', 'yoghurt', 'cheese', 'butter', 'ghee', 'cream', 'paneer', 'khoya', 'mast', 'doogh', 'lassi', 'kefir'])) allergens.add('dairy');
  if (has(['egg', 'eggs'])) allergens.add('egg');
  if (has(['almond', 'pistachio', 'cashew', 'walnut', 'hazelnut', 'pecan', 'tree nut'])) allergens.add('tree_nut');
  if (has(['peanut'])) allergens.add('peanut');
  if (has(['sesame', 'tahini'])) allergens.add('sesame');
  if (has(['soy', 'soya', 'tofu', 'tempeh', 'edamame'])) allergens.add('soy');
  if (has(['shrimp', 'prawn', 'crab', 'lobster', 'shellfish', 'mussels', 'clam', 'oyster'])) allergens.add('shellfish');
  if (has(['fish', 'salmon', 'tuna', 'hilsa', 'anchovy', 'sardine', 'cod', 'trout', 'mackerel'])) allergens.add('fish');
  if (has(['mustard'])) allergens.add('mustard');
  return [...allergens];
}

/** Estimate cook time based on dish category words in the description. */
function inferTimes(description) {
  const t = (description || '').toLowerCase();
  // Long braises / rice dishes / stews
  if (/(biryani|nihari|haleem|stew|braise|slow[- ]?cooked|dum\b|palaw|pulao|shorwa|chorba|qorma|korma)/.test(t)) {
    return { prep: 30, cook: 90 };
  }
  // Fried snacks / dumplings / breads
  if (/(kebab|kabab|samosa|bolani|dumpling|manti|manti|mantu|ashak)/.test(t)) {
    return { prep: 30, cook: 25 };
  }
  // Desserts
  if (/(dessert|firni|kheer|halva|halwa|pudding|jalebi|gulab jamun|mishti|ladoo)/.test(t)) {
    return { prep: 15, cook: 30 };
  }
  // Salads / raw preparations
  if (/(salad|chutney|raita|dip)/.test(t)) {
    return { prep: 15, cook: 0 };
  }
  // Everyday dish default
  return { prep: 15, cook: 30 };
}

/** Difficulty from cook time + ingredient count. */
function inferDifficulty(prep, cook, ingredientCount) {
  const total = prep + cook;
  if (total >= 120 || ingredientCount >= 15) return 'hard';
  if (total >= 45 || ingredientCount >= 8) return 'medium';
  return 'easy';
}

/**
 * Compose scaffolded cooking steps for a recipe that has no
 * machine-readable steps yet. The steps are:
 *   1) An honest note that a native-verified sequence isn't in yet.
 *   2) A generic mise-en-place / cook / serve outline based on the
 *      dish category so the recipe screen isn't empty.
 *   3) A link back to the source article.
 *
 * A reviewer replaces this whole block when they populate the real
 * step-by-step. The `authenticity_review='unreviewed'` flag makes it
 * easy to filter these in the admin UI.
 */
function generateScaffoldedSteps(dish, ingredientNames) {
  const desc = (dish.extract || '').toLowerCase();
  const category =
    /soup|stew/.test(desc) ? 'soup/stew' :
    /dessert|pudding|halva|firni/.test(desc) ? 'dessert' :
    /kebab|kabab|grill/.test(desc) ? 'grilled meat' :
    /salad|raita|chutney/.test(desc) ? 'raw/salad' :
    /bread|naan|roti|paratha|bolani/.test(desc) ? 'bread' :
    /rice|palaw|pulao|biryani/.test(desc) ? 'rice dish' :
    'general';

  const outlines = {
    'soup/stew': [
      'Prepare and measure every ingredient. Chop vegetables uniformly.',
      'Brown the meat (if any) in a heavy pot, then remove.',
      'Sauté onions and aromatics in the same pot until softened.',
      'Return the meat, add spices, and pour in liquid to cover.',
      'Simmer covered until the meat is tender — usually 60–90 minutes.',
      'Add tender vegetables in the last 15–20 minutes so they don’t overcook.',
      'Adjust salt and finish with fresh herbs. Serve hot.',
    ],
    dessert: [
      'Prepare and measure every ingredient. Bring dairy to room temperature if used.',
      'Combine the base according to the dish (rice/milk/flour/nuts as applicable).',
      'Cook gently on low heat, stirring often to prevent scorching or curdling.',
      'Sweeten and perfume with cardamom, rose water, or saffron per tradition.',
      'Cool to serving temperature; chill if the dish is traditionally served cold.',
      'Garnish with slivered nuts or edible petals just before serving.',
    ],
    'grilled meat': [
      'Cut the meat to uniform pieces (or shape onto skewers for ground meat).',
      'Marinate as tradition dictates — yogurt-and-spice bases are common.',
      'Rest the meat at room temperature 15–20 minutes before cooking.',
      'Prepare a very hot grill (charcoal preferred) or heavy pan.',
      'Grill quickly on all sides until charred outside and just cooked within.',
      'Rest briefly before serving; accompany with sliced onion, herbs, and bread.',
    ],
    'raw/salad': [
      'Wash and dry all produce thoroughly.',
      'Chop or slice ingredients as customary for the dish.',
      'Combine in a serving bowl.',
      'Dress with the traditional acid (lemon, vinegar) and salt to taste.',
      'Serve immediately for best texture.',
    ],
    bread: [
      'Mix the dough (flour + water/yogurt + salt) and knead until smooth.',
      'Rest the dough covered for at least 30 minutes so the gluten relaxes.',
      'Divide, shape, and roll or press to the traditional thickness.',
      'Cook on a very hot surface (griddle, tandoor, or heavy pan) until puffed.',
      'Brush with fat (butter, oil, or ghee) if traditional.',
      'Serve warm.',
    ],
    'rice dish': [
      'Rinse the rice until the water runs clear; soak 20–30 minutes; drain.',
      'Brown the meat (if any) with sliced onions in oil or ghee.',
      'Add whole and ground spices; cook briefly until fragrant.',
      'Add liquid (stock or water) and simmer the protein until tender.',
      'Layer or fold in the rice; add any vegetables, dried fruits, or nuts.',
      'Cover tightly and steam on lowest heat until the rice is fluffy — 20–30 minutes.',
      'Rest 10 minutes off heat, then fluff gently and serve.',
    ],
    general: [
      'Prepare and measure every ingredient.',
      'Cook the base ingredients per traditional method.',
      'Combine, season, and simmer until the dish is done to taste.',
      'Adjust seasoning and serve.',
    ],
  };

  const outline = outlines[category] ?? outlines.general;

  return [
    `⚠ Cooking steps here are AI-drafted (Emrooz seed) and awaiting native-cook review. For an authoritative guide, consult the source article: ${dish.url}`,
    ...outline,
    ingredientNames.length
      ? `Ingredients Wikipedia lists for this dish: ${ingredientNames.join(', ')}.`
      : 'Ingredients need to be added by a reviewer — Wikipedia did not list them in structured form.',
  ];
}

// ─── Args + env ─────────────────────────────────────────────────────

function parseArgs() {
  const args = { cuisine: null, publish: false, depth: 1, limit: 200 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cuisine') args.cuisine = argv[++i];
    else if (a === '--publish') args.publish = true;
    else if (a === '--depth') args.depth = Number(argv[++i]) || 1;
    else if (a === '--limit') args.limit = Number(argv[++i]) || 200;
  }
  return args;
}

const args = parseArgs();
if (!args.cuisine) {
  console.error('Usage: --cuisine <slug> [--publish] [--depth N] [--limit N]');
  console.error(`Available: ${Object.keys(CUISINE_CATEGORIES).join(', ')}`);
  process.exit(1);
}
const rootCategory = CUISINE_CATEGORIES[args.cuisine];
if (!rootCategory) {
  console.error(`Unknown cuisine "${args.cuisine}". Add it to CUISINE_CATEGORIES.`);
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY.');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// ─── Wikipedia category walk ────────────────────────────────────────

/**
 * Recursively list every article (ns=0) under the given category,
 * up to `maxDepth` category hops. Returns a Set of article titles.
 */
async function walkCategory(rootTitle, maxDepth) {
  const seen = new Set();
  const seenArticles = new Set();
  const stack = [[rootTitle, 0]];

  while (stack.length) {
    const [title, depth] = stack.pop();
    if (seen.has(title)) continue;
    seen.add(title);

    const params = new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: title,
      cmlimit: '500',
      format: 'json',
      origin: '*',
    });
    const res = await fetch(`${WIKIPEDIA_API}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) continue;
    const json = await res.json();
    const members = json.query?.categorymembers ?? [];

    for (const m of members) {
      if (m.ns === 14) {
        // subcategory
        if (depth < maxDepth) stack.push([m.title, depth + 1]);
      } else if (m.ns === 0) {
        if (!isNonDish(m.title)) seenArticles.add(m.title);
      }
    }
  }
  return [...seenArticles];
}

// ─── Wikipedia article details ──────────────────────────────────────

/**
 * Batch-fetch article extracts + pageprops (for Wikidata Q-ID) for up to
 * 50 titles at once (MediaWiki API limit).
 */
async function fetchArticleDetails(titles) {
  const result = new Map();
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const params = new URLSearchParams({
      action: 'query',
      prop: 'extracts|pageprops|pageimages',
      exintro: '1',
      explaintext: '1',
      exsentences: '5',
      piprop: 'original',
      ppprop: 'wikibase_item',
      redirects: '1',
      format: 'json',
      titles: batch.join('|'),
      origin: '*',
    });
    const res = await fetch(`${WIKIPEDIA_API}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) continue;
    const json = await res.json();
    const pages = json.query?.pages ?? {};
    for (const p of Object.values(pages)) {
      if (!p.title) continue;
      result.set(p.title, {
        title: p.title,
        extract: p.extract ?? null,
        qid: p.pageprops?.wikibase_item ?? null,
        image: p.original?.source ?? null,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
      });
    }
  }
  return result;
}

/**
 * For a batch of Q-IDs, fetch Wikidata ingredients (P527) as a name list.
 * Returns Map<Qid, string[]>.
 */
async function fetchWikidataIngredients(qids) {
  const result = new Map();
  for (let i = 0; i < qids.length; i += 40) {
    const batch = qids.slice(i, i + 40).filter(Boolean);
    if (!batch.length) continue;
    const params = new URLSearchParams({
      action: 'wbgetentities',
      ids: batch.join('|'),
      props: 'claims',
      format: 'json',
      origin: '*',
    });
    const res = await fetch(`${WIKIDATA_API}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) continue;
    const json = await res.json();
    const entities = json.entities ?? {};

    // Collect all referenced ingredient QIDs so we can resolve their labels
    // in a follow-up call.
    const ingredientQids = new Set();
    const perDish = new Map();
    for (const [qid, entity] of Object.entries(entities)) {
      const claims = entity.claims?.P527 ?? [];
      const list = [];
      for (const c of claims) {
        const id = c.mainsnak?.datavalue?.value?.id;
        if (id) {
          ingredientQids.add(id);
          list.push(id);
        }
      }
      perDish.set(qid, list);
    }

    // Resolve ingredient labels
    const labelMap = new Map();
    const ingArray = [...ingredientQids];
    for (let j = 0; j < ingArray.length; j += 40) {
      const b = ingArray.slice(j, j + 40);
      const p2 = new URLSearchParams({
        action: 'wbgetentities',
        ids: b.join('|'),
        props: 'labels',
        languages: 'en',
        format: 'json',
        origin: '*',
      });
      const r2 = await fetch(`${WIKIDATA_API}?${p2}`, { headers: { 'User-Agent': USER_AGENT } });
      if (!r2.ok) continue;
      const j2 = await r2.json();
      for (const [q, e] of Object.entries(j2.entities ?? {})) {
        const label = e.labels?.en?.value;
        if (label) labelMap.set(q, label);
      }
    }

    for (const [qid, ingList] of perDish) {
      result.set(
        qid,
        ingList.map((q) => labelMap.get(q)).filter(Boolean),
      );
    }
  }
  return result;
}

// ─── Slug + description helpers ─────────────────────────────────────

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Truncate the Wikipedia extract to a reasonable card-sized description. */
function trimExtract(extract) {
  if (!extract) return null;
  const paragraphs = extract.split(/\n{2,}/).slice(0, 2).join('\n\n');
  return paragraphs.length > 700
    ? paragraphs.slice(0, 700).replace(/\s+\S*$/, '') + '…'
    : paragraphs;
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log(`\n[wiki-import] cuisine="${args.cuisine}" root="${rootCategory}" depth=${args.depth}`);

  const [{ data: cuisines }, { data: ingredients }] = await Promise.all([
    supabase.from('cuisines').select('id, slug').eq('slug', args.cuisine),
    supabase.from('ingredients').select('id, slug, name_en'),
  ]);
  const cuisineId = cuisines?.[0]?.id;
  if (!cuisineId) {
    console.error(`Cuisine "${args.cuisine}" not in public.cuisines. Seed it first.`);
    process.exit(1);
  }
  const nameToIngredientId = new Map();
  for (const i of ingredients ?? []) {
    nameToIngredientId.set(i.name_en.toLowerCase(), i.id);
    nameToIngredientId.set(i.slug.toLowerCase(), i.id);
  }

  console.log(`[wiki-import] walking category tree…`);
  const titles = (await walkCategory(rootCategory, args.depth)).slice(0, args.limit);
  console.log(`[wiki-import] ${titles.length} candidate dishes after filtering`);

  console.log(`[wiki-import] fetching article details…`);
  const details = await fetchArticleDetails(titles);
  console.log(`[wiki-import] resolved details for ${details.size} pages`);

  const qids = [...details.values()].map((d) => d.qid).filter(Boolean);
  console.log(`[wiki-import] fetching Wikidata ingredients for ${qids.length} Q-IDs…`);
  const ingredientsByQid = await fetchWikidataIngredients(qids);

  const editorialState = args.publish ? 'published' : 'draft';
  let ok = 0, fail = 0, skipped = 0;

  for (const d of details.values()) {
    if (!d.title || !d.extract) {
      skipped++;
      continue;
    }
    const description = trimExtract(d.extract);
    const dishQid = d.qid ?? null;
    const slug = slugify(d.title) + (dishQid ? '-' + dishQid.toLowerCase() : '');

    // Wikipedia ingredient names (Wikidata P527)
    const rawIngredients = dishQid ? ingredientsByQid.get(dishQid) ?? [] : [];

    // Heuristic AI enrichment for everything Wikipedia doesn't provide.
    const inferredMealTypes = inferMealTypes(description);
    const inferredDietary = inferDietaryTags(rawIngredients, description);
    const inferredAllergens = inferAllergens(rawIngredients, description);
    const { prep, cook } = inferTimes(description);
    const totalMin = Math.max(1, prep + cook);
    const difficulty = inferDifficulty(prep, cook, rawIngredients.length);
    const stepsText = generateScaffoldedSteps(d, rawIngredients);

    // Idempotent upsert: delete any prior row with this slug or QID
    if (dishQid) {
      await supabase
        .from('recipes')
        .delete()
        .eq('source_provider', 'wikipedia')
        .eq('source_recipe_id', dishQid);
    } else {
      await supabase.from('recipes').delete().eq('slug', slug);
    }

    const { data: created, error } = await supabase
      .from('recipes')
      .insert({
        slug,
        title_en: d.title,
        description_en: description,
        prep_minutes: prep,
        cook_minutes: cook,
        total_minutes: totalMin,
        difficulty,
        meal_types: inferredMealTypes,
        servings: 4,
        dietary_tags: inferredDietary,
        allergens: inferredAllergens,
        content_owner: 'Wikipedia contributors',
        ownership_type: 'licensed',
        source_provider: 'wikipedia',
        source_recipe_id: dishQid ?? d.title,
        source_url: d.url,
        source_terms_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
        source_terms_version: '4.0',
        source_license: 'CC BY-SA 4.0',
        source_license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
        attribution_text: `${d.title} — text under CC BY-SA 4.0 from English Wikipedia`,
        attribution_url: d.url,
        storage_permission: 'permanent',
        editorial_state: editorialState,
        authenticity_review: 'unreviewed',
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  ✗ ${d.title}: ${error.message}`);
      fail++;
      continue;
    }
    const recipeId = created.id;

    await supabase.from('recipe_cuisines').insert({ recipe_id: recipeId, cuisine_id: cuisineId });

    // Ingredient rows (best-effort link to public.ingredients by name)
    const rows = rawIngredients
      .map((name, idx) => {
        const uuid = nameToIngredientId.get(name.toLowerCase());
        return uuid
          ? {
              recipe_id: recipeId,
              ingredient_id: uuid,
              position: idx,
              quantity: null,
              unit: null,
              note_en: null,
              optional: false,
              group_en: null,
            }
          : null;
      })
      .filter(Boolean);
    if (rows.length) {
      await supabase.from('recipe_ingredients').insert(rows);
    }

    // Step rows (scaffolded AI-drafted outline — reviewer replaces with the
    // real sequence before app-store submission).
    const stepRows = stepsText.map((text, idx) => ({
      recipe_id: recipeId,
      step_order: idx,
      text_en: text,
      duration_minutes: null,
    }));
    if (stepRows.length) {
      await supabase.from('recipe_steps').insert(stepRows);
    }

    console.log(
      `  ✓ ${d.title.padEnd(35)} ${dishQid ? '[' + dishQid + ']' : ''}  ${rows.length} ing, ${stepRows.length} steps, ${difficulty}`,
    );
    ok++;
  }

  console.log(`\n[wiki-import] done. inserted=${ok}  skipped=${skipped}  failed=${fail}\n`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

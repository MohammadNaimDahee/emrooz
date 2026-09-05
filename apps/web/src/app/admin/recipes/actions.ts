'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getServerSupabase } from '../../../lib/supabase-server';
import { STAFF_ROLES } from '../../../lib/staff-auth';

/**
 * Server actions for the recipe editor. Every action is gated on staff
 * membership before touching the database — RLS also enforces this at the
 * row level, but checking here first gives us cleaner error messages and
 * skips wasted round trips.
 *
 * All writes fan out across `recipes`, `recipe_cuisines`, `recipe_regions`,
 * `recipe_ingredients`, and `recipe_steps`. For V1 they run as a sequence
 * inside the request; the write budget per recipe is small (<50 rows in
 * the worst case) and RLS prevents partial cross-user writes. A future
 * refactor may lift this into a Postgres function for atomicity.
 */

async function requireEditorClient() {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error('Backend not configured — missing Supabase env vars.');

  // Distinguish the three failure modes so we can debug from the client:
  //   1. No session cookie at all (getUser() returns error / null user)
  //   2. Session valid but user has no staff_members row
  //   3. Session valid, staff row exists, but role isn't in STAFF_ROLES
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    throw new Error(
      `Sign-in required (server saw no session${userErr ? `: ${userErr.message}` : ''}). Sign out and back in on the browser tab to refresh cookies.`,
    );
  }

  const { data: staff, error: staffErr } = await supabase
    .from('staff_members')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (staffErr) throw new Error(`Staff lookup failed: ${staffErr.message}`);
  if (!staff) {
    throw new Error(
      `Staff access required — user ${userData.user.email ?? userData.user.id} has no staff_members row.`,
    );
  }
  if (!(STAFF_ROLES as readonly string[]).includes(staff.role)) {
    throw new Error(
      `Staff access required — user has role "${staff.role}", expected one of ${STAFF_ROLES.join(', ')}.`,
    );
  }
  return { supabase, userId: userData.user.id };
}

export interface RecipeEditorInput {
  id?: string;
  version?: number;
  slug: string;
  title_en: string;
  description_en?: string;
  origin_country_id?: string | null;
  prep_minutes: number;
  cook_minutes: number;
  total_minutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  meal_types: string[];
  servings: number;
  dietary_tags: string[];
  allergens: string[];
  content_owner: string;
  ownership_type:
    'emrooz_owned' | 'licensed' | 'open_license' | 'provider_hosted' | 'external_link_only';
  source_provider?: string | null;
  source_recipe_id?: string | null;
  source_url?: string | null;
  attribution_text?: string | null;
  storage_permission:
    'permanent' | 'subscription_only' | 'temporary_cache' | 'metadata_only' | 'not_permitted';
  cuisine_ids: string[];
  region_ids: string[];
  ingredients: Array<{
    ingredient_id: string;
    position: number;
    quantity: number | null;
    unit: string | null;
    note_en: string | null;
    optional: boolean;
    group_en: string | null;
  }>;
  steps: Array<{
    step_order: number;
    text_en: string;
    duration_minutes: number | null;
  }>;
}

export async function saveRecipe(input: RecipeEditorInput): Promise<{ id: string }> {
  const { supabase, userId } = await requireEditorClient();

  const isCreate = !input.id;
  const parentPayload = {
    slug: input.slug,
    title_en: input.title_en,
    description_en: input.description_en ?? null,
    origin_country_id: input.origin_country_id ?? null,
    prep_minutes: input.prep_minutes,
    cook_minutes: input.cook_minutes,
    total_minutes: input.total_minutes,
    difficulty: input.difficulty,
    meal_types: input.meal_types,
    servings: input.servings,
    dietary_tags: input.dietary_tags,
    allergens: input.allergens,
    content_owner: input.content_owner,
    ownership_type: input.ownership_type,
    source_provider: input.source_provider ?? null,
    source_recipe_id: input.source_recipe_id ?? null,
    source_url: input.source_url ?? null,
    attribution_text: input.attribution_text ?? null,
    storage_permission: input.storage_permission,
  };

  let id = input.id;
  if (isCreate) {
    const { data, error } = await supabase
      .from('recipes')
      .insert({ ...parentPayload, editorial_state: 'draft' })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    id = data.id;
  } else {
    // Snapshot the current state into recipe_versions before we overwrite it.
    // Falls through silently on failure — the version table is a safety net,
    // not a blocker for the edit.
    await snapshotRecipe(supabase, input.id!, userId, 'edit').catch((err) => {
      console.warn('[emrooz] version snapshot failed', err);
    });
    // Bump version alongside the update so the audit trail is easy to read.
    const { error } = await supabase
      .from('recipes')
      .update({ ...parentPayload, version: (input.version ?? 0) + 1 })
      .eq('id', input.id);
    if (error) throw new Error(error.message);
  }
  if (!id) throw new Error('Failed to resolve recipe id.');

  // Replace-strategy for child rows. Simpler than a full diff, and safe
  // under RLS because every delete/insert scopes to the same recipe id.
  await Promise.all([
    supabase.from('recipe_cuisines').delete().eq('recipe_id', id),
    supabase.from('recipe_regions').delete().eq('recipe_id', id),
    supabase.from('recipe_ingredients').delete().eq('recipe_id', id),
    supabase.from('recipe_steps').delete().eq('recipe_id', id),
  ]);

  if (input.cuisine_ids.length > 0) {
    const { error } = await supabase
      .from('recipe_cuisines')
      .insert(input.cuisine_ids.map((cuisine_id) => ({ recipe_id: id, cuisine_id })));
    if (error) throw new Error(`Cuisines: ${error.message}`);
  }
  if (input.region_ids.length > 0) {
    const { error } = await supabase
      .from('recipe_regions')
      .insert(input.region_ids.map((region_id) => ({ recipe_id: id, region_id })));
    if (error) throw new Error(`Regions: ${error.message}`);
  }
  if (input.ingredients.length > 0) {
    const { error } = await supabase
      .from('recipe_ingredients')
      .insert(input.ingredients.map((i) => ({ ...i, recipe_id: id })));
    if (error) throw new Error(`Ingredients: ${error.message}`);
  }
  if (input.steps.length > 0) {
    const { error } = await supabase
      .from('recipe_steps')
      .insert(input.steps.map((s) => ({ ...s, recipe_id: id })));
    if (error) throw new Error(`Steps: ${error.message}`);
  }

  revalidatePath('/admin/recipes');
  revalidatePath(`/admin/recipes/${id}`);
  revalidatePath(`/recipes/${input.slug}`);
  return { id };
}

export type EditorialTransition =
  'needs_review' | 'reviewed' | 'published' | 'rejected' | 'archived' | 'draft';

const TRANSITION_UPDATES: Record<EditorialTransition, Record<string, unknown>> = {
  needs_review: { editorial_state: 'needs_review' },
  reviewed: { editorial_state: 'reviewed' },
  published: { editorial_state: 'published', published_at: new Date().toISOString() },
  rejected: { editorial_state: 'rejected' },
  archived: { editorial_state: 'archived' },
  draft: { editorial_state: 'draft' },
};

export async function setEditorialState(id: string, state: EditorialTransition): Promise<void> {
  const { supabase } = await requireEditorClient();
  const payload = TRANSITION_UPDATES[state];
  const { error } = await supabase.from('recipes').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/recipes');
  revalidatePath(`/admin/recipes/${id}`);
}

export async function deleteRecipe(id: string): Promise<void> {
  const { supabase } = await requireEditorClient();
  // FK cascades on child tables handle the delete fanout.
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  redirect('/admin/recipes');
}

// ────────────────────────────────────────────────────────────────
// Version history
// ────────────────────────────────────────────────────────────────

interface RecipeSnapshot {
  parent: Record<string, unknown>;
  cuisines: { cuisine_id: string }[];
  regions: { region_id: string }[];
  ingredients: unknown[];
  steps: unknown[];
}

/**
 * Take an atomic snapshot of a recipe (parent + children) and write it into
 * `recipe_versions`. Called before every edit so the pre-edit state is
 * recoverable, and after every restore so a restored version becomes the
 * new baseline in the history.
 */
async function snapshotRecipe(
  supabase: Awaited<ReturnType<typeof requireEditorClient>>['supabase'],
  recipeId: string,
  editorId: string,
  reason: 'edit' | 'restore',
): Promise<void> {
  const [
    { data: parent },
    { data: cuisines },
    { data: regions },
    { data: ingredients },
    { data: steps },
  ] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', recipeId).maybeSingle(),
    supabase.from('recipe_cuisines').select('cuisine_id').eq('recipe_id', recipeId),
    supabase.from('recipe_regions').select('region_id').eq('recipe_id', recipeId),
    supabase.from('recipe_ingredients').select('*').eq('recipe_id', recipeId),
    supabase.from('recipe_steps').select('*').eq('recipe_id', recipeId),
  ]);
  if (!parent) return;
  const snapshot: RecipeSnapshot = {
    parent: parent as Record<string, unknown>,
    cuisines: (cuisines as { cuisine_id: string }[] | null) ?? [],
    regions: (regions as { region_id: string }[] | null) ?? [],
    ingredients: (ingredients as unknown[] | null) ?? [],
    steps: (steps as unknown[] | null) ?? [],
  };
  const version = (parent as { version?: number }).version ?? 1;
  await supabase.from('recipe_versions').insert({
    recipe_id: recipeId,
    version,
    snapshot,
    editor_id: editorId,
    change_reason: reason,
  });
}

interface StoredSnapshot {
  parent?: {
    slug?: string;
    title_en?: string;
    description_en?: string | null;
    origin_country_id?: string | null;
    prep_minutes?: number;
    cook_minutes?: number;
    total_minutes?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    meal_types?: string[];
    servings?: number;
    dietary_tags?: string[];
    allergens?: string[];
    content_owner?: string;
    ownership_type?: string;
    source_provider?: string | null;
    source_recipe_id?: string | null;
    source_url?: string | null;
    attribution_text?: string | null;
    storage_permission?: string;
  };
  cuisines?: { cuisine_id: string }[];
  regions?: { region_id: string }[];
  ingredients?: Array<{
    ingredient_id: string;
    position: number | null;
    quantity: number | null;
    unit: string | null;
    note_en: string | null;
    optional: boolean;
    group_en: string | null;
  }>;
  steps?: Array<{
    step_order: number;
    text_en: string;
    duration_minutes: number | null;
  }>;
}

/**
 * Roll a recipe back to the state stored in `recipe_versions.snapshot`.
 * Writes the current state as its own version before overwriting, so a
 * restore never destroys history — it just adds a new step to it.
 */
export async function restoreRecipeVersion(versionId: string): Promise<void> {
  const { supabase, userId } = await requireEditorClient();
  const { data: row, error } = await supabase
    .from('recipe_versions')
    .select('recipe_id, version, snapshot')
    .eq('id', versionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error('Version not found.');
  const recipeId = row.recipe_id as string;
  const snapshot = row.snapshot as StoredSnapshot;
  const parent = snapshot.parent ?? {};

  // Snapshot the current state first so restores are undoable.
  await snapshotRecipe(supabase, recipeId, userId, 'restore').catch((err) => {
    console.warn('[emrooz] pre-restore snapshot failed', err);
  });

  const { data: current } = await supabase
    .from('recipes')
    .select('version')
    .eq('id', recipeId)
    .maybeSingle<{ version: number }>();

  const { error: updateErr } = await supabase
    .from('recipes')
    .update({
      slug: parent.slug,
      title_en: parent.title_en,
      description_en: parent.description_en ?? null,
      origin_country_id: parent.origin_country_id ?? null,
      prep_minutes: parent.prep_minutes,
      cook_minutes: parent.cook_minutes,
      total_minutes: parent.total_minutes,
      difficulty: parent.difficulty,
      meal_types: parent.meal_types,
      servings: parent.servings,
      dietary_tags: parent.dietary_tags,
      allergens: parent.allergens,
      content_owner: parent.content_owner,
      ownership_type: parent.ownership_type,
      source_provider: parent.source_provider ?? null,
      source_recipe_id: parent.source_recipe_id ?? null,
      source_url: parent.source_url ?? null,
      attribution_text: parent.attribution_text ?? null,
      storage_permission: parent.storage_permission,
      version: (current?.version ?? 1) + 1,
    })
    .eq('id', recipeId);
  if (updateErr) throw new Error(updateErr.message);

  await Promise.all([
    supabase.from('recipe_cuisines').delete().eq('recipe_id', recipeId),
    supabase.from('recipe_regions').delete().eq('recipe_id', recipeId),
    supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId),
    supabase.from('recipe_steps').delete().eq('recipe_id', recipeId),
  ]);

  if ((snapshot.cuisines?.length ?? 0) > 0) {
    await supabase
      .from('recipe_cuisines')
      .insert(snapshot.cuisines!.map((c) => ({ recipe_id: recipeId, cuisine_id: c.cuisine_id })));
  }
  if ((snapshot.regions?.length ?? 0) > 0) {
    await supabase
      .from('recipe_regions')
      .insert(snapshot.regions!.map((r) => ({ recipe_id: recipeId, region_id: r.region_id })));
  }
  if ((snapshot.ingredients?.length ?? 0) > 0) {
    await supabase.from('recipe_ingredients').insert(
      snapshot.ingredients!.map((i) => ({
        recipe_id: recipeId,
        ingredient_id: i.ingredient_id,
        position: i.position ?? 0,
        quantity: i.quantity,
        unit: i.unit,
        note_en: i.note_en,
        optional: i.optional,
        group_en: i.group_en,
      })),
    );
  }
  if ((snapshot.steps?.length ?? 0) > 0) {
    await supabase.from('recipe_steps').insert(
      snapshot.steps!.map((s) => ({
        recipe_id: recipeId,
        step_order: s.step_order,
        text_en: s.text_en,
        duration_minutes: s.duration_minutes,
      })),
    );
  }

  revalidatePath('/admin/recipes');
  revalidatePath(`/admin/recipes/${recipeId}`);
  if (parent.slug) revalidatePath(`/recipes/${parent.slug}`);
}

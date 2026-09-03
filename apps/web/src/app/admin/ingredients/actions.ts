'use server';
import { revalidatePath } from 'next/cache';

import { getServerSupabase } from '../../../lib/supabase-server';
import { STAFF_ROLES } from '../../../lib/staff-auth';

async function requireEditor() {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error('Backend not configured.');
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Sign in required.');
  const { data: staff } = await supabase
    .from('staff_members')
    .select('role')
    .eq('user_id', data.user.id)
    .in('role', ['admin', 'editor'] as never)
    .maybeSingle();
  if (!staff) throw new Error('Editor access required.');
  return supabase;
}

export interface IngredientPayload {
  id?: string;
  slug: string;
  name_en: string;
  category: string;
  common_units: string[];
  allergens: string[];
  dietary_compatibility: Record<string, string>;
  aliases: string[];
}

export async function saveIngredient(payload: IngredientPayload) {
  const supabase = await requireEditor();

  let id = payload.id;
  const parent = {
    slug: payload.slug,
    name_en: payload.name_en,
    category: payload.category,
    common_units: payload.common_units,
    allergens: payload.allergens,
    dietary_compatibility: payload.dietary_compatibility,
  };

  if (!id) {
    const { data, error } = await supabase.from('ingredients').insert(parent).select('id').single();
    if (error) throw new Error(error.message);
    id = data.id;
  } else {
    const { error } = await supabase.from('ingredients').update(parent).eq('id', id);
    if (error) throw new Error(error.message);
  }
  if (!id) throw new Error('Failed to resolve ingredient id.');

  // Replace aliases wholesale — every alias belongs to exactly one ingredient
  // and the count is small.
  await supabase.from('ingredient_aliases').delete().eq('ingredient_id', id);
  const trimmed = payload.aliases
    .map((a) => a.trim())
    .filter((a): a is string => Boolean(a));
  if (trimmed.length > 0) {
    const { error } = await supabase
      .from('ingredient_aliases')
      .insert(trimmed.map((alias) => ({ ingredient_id: id, alias, locale: 'en' })));
    if (error) throw new Error(`Aliases: ${error.message}`);
  }

  revalidatePath('/admin/ingredients');
  return { id };
}

export async function deleteIngredient(id: string) {
  const supabase = await requireEditor();
  const { error } = await supabase.from('ingredients').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/ingredients');
}

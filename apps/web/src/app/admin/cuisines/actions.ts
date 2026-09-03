'use server';
import { revalidatePath } from 'next/cache';

import { getServerSupabase } from '../../../lib/supabase-server';

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

export interface CuisinePayload {
  id?: string;
  slug: string;
  name_en: string;
  primary_country_id: string | null;
}

export async function saveCuisine(payload: CuisinePayload) {
  const supabase = await requireEditor();
  const record = {
    slug: payload.slug,
    name_en: payload.name_en,
    primary_country_id: payload.primary_country_id,
  };
  if (payload.id) {
    const { error } = await supabase.from('cuisines').update(record).eq('id', payload.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('cuisines').insert(record);
    if (error) throw new Error(error.message);
  }
  revalidatePath('/admin/cuisines');
}

export async function deleteCuisine(id: string) {
  const supabase = await requireEditor();
  const { error } = await supabase.from('cuisines').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/cuisines');
}

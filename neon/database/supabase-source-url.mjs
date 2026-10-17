import { expectedSupabaseProjectId } from './supabase-snapshot-validation.mjs';

export function validatedSupabaseSourceUrl(value) {
  let url;
  try {
    url = new URL(value ?? '');
  } catch {
    throw new Error('SUPABASE_URL does not identify the selected source project');
  }
  if (url.protocol !== 'https:' || url.hostname !== `${expectedSupabaseProjectId}.supabase.co`
      || url.port || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('SUPABASE_URL does not identify the selected source project');
  }
  return url;
}

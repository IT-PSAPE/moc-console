// @moc/data uses deep imports — `import { fetchRequests } from '@moc/data/fetch-requests'`
// to avoid name collisions in the flat data layer (e.g. fetchPlaylists is defined
// in both fetch-streams and fetch-broadcast). Only the supabase client is exposed here.
export { supabase } from './supabase'

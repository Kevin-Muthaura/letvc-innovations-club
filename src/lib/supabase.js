import { createClient } from '@supabase/supabase-js';
const URL  = process.env.REACT_APP_SUPABASE_URL;
const ANON = process.env.REACT_APP_SUPABASE_ANON_KEY;
export const supabase = createClient(URL, ANON, { auth:{ persistSession:true, autoRefreshToken:true } });
export async function logAudit(action, entity, entityId, performedBy, details='') {
  await supabase.from('audit_log').insert({ action, entity, entity_id:String(entityId??''), performed_by:performedBy, details });
}

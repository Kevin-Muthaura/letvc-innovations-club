import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid, email) {
    try {
      let { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (!data) {
        const { data: created } = await supabase.from('profiles').upsert({
          id: uid, email: email||'', full_name:'', role:'member'
        }, { onConflict:'id' }).select().single();
        data = created;
      }
      setProfile(data);
      return data;
    } catch {
      setProfile({ id:uid, email:email||'', role:'member', full_name:'' });
      return null;
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session.user.email).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session.user.email);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await fetchProfile(data.user.id, data.user.email);
  }

  async function signUp(email, password, meta={}) {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data:{ full_name:meta.full_name||'', section:meta.section||'', adm_no:meta.adm_no||null, phone:meta.phone||'' } }
    });
    if (error) throw error;
    if (data.user) {
      await supabase.from('profiles').upsert({
        id:data.user.id, email, full_name:meta.full_name||'', role:'member',
        section:meta.section||'', adm_no:meta.adm_no||null, phone:meta.phone||''
      }, { onConflict:'id', ignoreDuplicates:true });
    }
  }

  async function signOut() { await supabase.auth.signOut(); setUser(null); setProfile(null); }
  async function refreshProfile() { if (user) return fetchProfile(user.id, user.email); }

  return (
    <Ctx.Provider value={{ user, profile, loading,
      isAdmin: profile?.role==='admin',
      isEditor: ['admin','editor'].includes(profile?.role),
      signIn, signUp, signOut, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}
export const useAuth = () => useContext(Ctx);

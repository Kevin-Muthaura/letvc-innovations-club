import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid) {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile(data);
    return data;
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await fetchProfile(data.user.id);
  }

  async function signUp(email, password, meta = {}) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email,
        full_name: meta.full_name || '',
        role: meta.role || 'member',
        section: meta.section || '',
        adm_no: meta.adm_no || null,
        phone: meta.phone || ''
      });
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
  }

  async function refreshProfile() {
    if (user) return fetchProfile(user.id);
  }

  return (
    <Ctx.Provider value={{
      user, profile, loading,
      isAdmin:  profile?.role === 'admin',
      isEditor: ['admin','editor'].includes(profile?.role),
      signIn, signUp, signOut, refreshProfile
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Btn, Inp, Txt, Card, useToast, C } from '../components/UI';

const SKILLS_LIST = ['Programming','Design','Business','Robotics','Electronics','Plumbing','Construction','Cosmetology','Tourism','Hospitality','Fashion','Agriculture','Mechanical','Research','Public Speaking','Marketing'];
const BADGE_MAP = { innovator:'💡 Innovator', top_voter:'🗳️ Top Voter', builder:'🔨 Builder', mentor_pick:'⭐ Mentor Pick', pioneer:'🚀 Pioneer' };
const ROLE_C = { admin:'red', editor:'amber', mentor:'teal', member:'blue' };

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { show, Toasts } = useToast();
  const [editing, setEditing] = useState(false);
  const [form,    setForm]    = useState({ full_name:'', section:'', phone:'', bio:'', skills:[] });
  const [saving,  setSaving]  = useState(false);

  function startEdit() {
    setForm({ full_name:profile?.full_name||'', section:profile?.section||'', phone:profile?.phone||'', bio:profile?.bio||'', skills:profile?.skills||[] });
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name:form.full_name, section:form.section, phone:form.phone, bio:form.bio, skills:form.skills }).eq('id',profile.id);
    if (error) { show(error.message,'error'); }
    else { await refreshProfile(); show('Profile updated'); setEditing(false); }
    setSaving(false);
  }

  function toggleSkill(s) {
    setForm(f => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter(x=>x!==s) : [...f.skills, s] }));
  }

  if (!profile) return <div style={{ textAlign:'center', padding:'4rem', color:C.text3 }}>Loading profile…</div>;

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <Toasts />
      <div style={{ marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>👤 My Profile</h2>
        <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>Your account and contribution details</p>
      </div>

      {/* Header card */}
      <Card style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:18, alignItems:'flex-start', flexWrap:'wrap' }}>
          <Avatar name={profile.full_name||profile.email||'?'} size={80} section={profile.section} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:22, color:C.text }}>{profile.full_name||'(no name set)'}</div>
            <div style={{ fontSize:14, color:C.text3, marginTop:2 }}>{profile.email}</div>
            <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
              <Badge label={profile.role} color={ROLE_C[profile.role]||'blue'} />
              {profile.section && <Badge label={profile.section} color="teal" />}
              <Badge label={`⭐ ${profile.points||0} pts`} color="amber" />
            </div>
            {(profile.badges||[]).length > 0 && (
              <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                {(profile.badges).map(b => BADGE_MAP[b] && <Badge key={b} label={BADGE_MAP[b]} color="purple" />)}
              </div>
            )}
          </div>
          <Btn icon="edit" onClick={startEdit}>Edit Profile</Btn>
        </div>
        {profile.bio && <p style={{ fontSize:14, color:C.text2, marginTop:14, lineHeight:1.7, fontStyle:'italic', borderTop:`1px solid ${C.border}`, paddingTop:14 }}>"{profile.bio}"</p>}
      </Card>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
        {[['Points Earned',profile.points||0,'star','amber'],['Badges',( profile.badges||[]).length,'award','purple'],['Skills',(profile.skills||[]).length,'tool','teal']].map(([l,v,i,c])=>(
          <Card key={l} style={{ textAlign:'center' }}>
            <i className={`ti ti-${i}`} style={{ fontSize:28, color: c==='amber'?C.warn:c==='purple'?C.primary2:C.accent, marginBottom:8, display:'block' }} />
            <div style={{ fontWeight:800, fontSize:24, color:C.text }}>{v}</div>
            <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{l}</div>
          </Card>
        ))}
      </div>

      {/* Skills */}
      <Card>
        <h3 style={{ fontWeight:700, color:C.text, marginBottom:12 }}>My Skills</h3>
        {(profile.skills||[]).length === 0
          ? <p style={{ color:C.text3, fontSize:13 }}>No skills added yet. Edit your profile to add skills.</p>
          : <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{(profile.skills).map(s=><Badge key={s} label={s} color="blue" />)}</div>
        }
      </Card>

      {/* Edit modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem', backdropFilter:'blur(4px)' }}>
          <div style={{ background:C.bg2, border:`1px solid ${C.border2}`, borderRadius:14, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', padding:'1.5rem', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontWeight:700, color:C.text }}>Edit Profile</h3>
              <button onClick={() => setEditing(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3, fontSize:20 }}><i className="ti ti-x"/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Inp label="Full Name" value={form.full_name} onChange={v=>setForm({...form,full_name:v})} placeholder="Your full name" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Inp label="Department / Section" value={form.section} onChange={v=>setForm({...form,section:v})} placeholder="e.g. ICT" />
                <Inp label="Phone" value={form.phone} onChange={v=>setForm({...form,phone:v})} placeholder="254XXXXXXXXX" />
              </div>
              <Txt label="Bio" value={form.bio} onChange={v=>setForm({...form,bio:v})} placeholder="Tell the club about yourself…" rows={3} />
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:8 }}>Skills (select all that apply)</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {SKILLS_LIST.map(s => (
                    <button key={s} onClick={() => toggleSkill(s)} style={{ padding:'5px 13px', borderRadius:99, border:`1px solid ${form.skills.includes(s)?C.primary:C.border}`, background:form.skills.includes(s)?C.primaryBg:'transparent', color:form.skills.includes(s)?C.primary2:C.text3, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit', transition:'all 0.15s' }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop:'1.25rem', display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn onClick={() => setEditing(false)}>Cancel</Btn>
              <Btn variant="primary" icon="device-floppy" onClick={save} disabled={saving}>{saving?'Saving…':'Save Profile'}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

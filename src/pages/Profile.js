import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Btn, Inp, Txt, Card, useToast, C } from '../components/UI';

const SKILLS = ['Programming','Design','Business','Robotics','Electronics','Plumbing','Construction','Cosmetology','Tourism','Hospitality','Fashion','Agriculture','Mechanical','Research','Public Speaking','Marketing'];
const BADGE_MAP = { innovator:'🧠 Innovator', top_voter:'🗳️ Top Voter', builder:'🛠 Builder', mentor_pick:'⭐ Mentor Pick', pioneer:'🚀 Pioneer', collaborator:'🤝 Collaborator', trending:'🔥 Trending' };
const ROLE_C = { admin:'red', editor:'amber', mentor:'teal', member:'blue' };
const YEARS  = ['Year 1','Year 2','Year 3','Graduate'];

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { show, Toasts } = useToast();
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Profile might be a minimal stub for brand-new users — that is fine,
  // we render whatever we have and let them fill in the rest
  const p = profile || {};

  function startEdit() {
    setForm({
      full_name:    p.full_name    || '',
      section:      p.section      || '',
      phone:        p.phone        || '',
      bio:          p.bio          || '',
      skills:       p.skills       || [],
      year_of_study:p.year_of_study|| '',
    });
    setEditing(true);
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) return show('Image must be under 2MB','error');
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `avatars/${p.id}.${ext}`;
      const { error:upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert:true });
      if (upErr) throw upErr;
      const { data:{ publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl+'?t='+Date.now() }).eq('id', p.id);
      await refreshProfile();
      show('Profile photo updated! 📸');
    } catch {
      // fallback: base64 for small images
      const reader = new FileReader();
      reader.onload = async ev => {
        await supabase.from('profiles').update({ avatar_url: ev.target.result }).eq('id', p.id);
        await refreshProfile();
        show('Profile photo updated! 📸');
        setUploading(false);
      };
      reader.readAsDataURL(file); return;
    }
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name, section: form.section, phone: form.phone,
      bio: form.bio, skills: form.skills, year_of_study: form.year_of_study,
    }).eq('id', p.id);
    if (error) { show(error.message,'error'); }
    else { await refreshProfile(); show('Profile updated ✅'); setEditing(false); }
    setSaving(false);
  }

  function toggleSkill(s) {
    setForm(f => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter(x=>x!==s) : [...f.skills, s] }));
  }

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <Toasts/>
      <div style={{ marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>👤 My Profile</h2>
        <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>Your account, skills and achievements</p>
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:18, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <Avatar name={p.full_name||p.email||'?'} size={88} section={p.section} url={p.avatar_url}/>
            <button onClick={()=>fileRef.current?.click()}
              style={{ position:'absolute', bottom:0, right:0, width:28, height:28, borderRadius:'50%', background:C.primary, border:`2px solid ${C.bg2}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
              {uploading ? <i className="ti ti-loader-2 spin" style={{ fontSize:14 }}/> : <i className="ti ti-camera" style={{ fontSize:14 }}/>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} style={{ display:'none' }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:22, color:C.text }}>{p.full_name || '(tap Edit Profile to add your name)'}</div>
            <div style={{ fontSize:14, color:C.text3, marginTop:2 }}>{p.email}</div>
            {p.year_of_study && <div style={{ fontSize:13, color:C.text3, marginTop:2 }}>{p.year_of_study}</div>}
            <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
              <Badge label={p.role||'member'} color={ROLE_C[p.role]||'blue'}/>
              {p.section && <Badge label={p.section} color="teal"/>}
              <Badge label={`⭐ ${p.points||0} pts`} color="amber"/>
            </div>
            {(p.badges||[]).length > 0 && (
              <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                {p.badges.map(b => BADGE_MAP[b] && <Badge key={b} label={BADGE_MAP[b]} color="purple"/>)}
              </div>
            )}
          </div>
          <Btn icon="edit" onClick={startEdit}>Edit Profile</Btn>
        </div>
        {p.bio && <p style={{ fontSize:14, color:C.text2, marginTop:14, lineHeight:1.7, fontStyle:'italic', borderTop:`1px solid ${C.border}`, paddingTop:14 }}>"{p.bio}"</p>}
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
        {[['Points',p.points||0,'star','amber'],['Badges',(p.badges||[]).length,'award','purple'],['Skills',(p.skills||[]).length,'tool','teal']].map(([l,v,i,c])=>(
          <Card key={l} style={{ textAlign:'center' }}>
            <i className={`ti ti-${i}`} style={{ fontSize:28, color:c==='amber'?C.warn:c==='purple'?C.primary2:C.accent, marginBottom:8, display:'block' }}/>
            <div style={{ fontWeight:800, fontSize:24, color:C.text }}>{v}</div>
            <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{l}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom:16 }}>
        <h3 style={{ fontWeight:700, color:C.text, marginBottom:12 }}>Contact Information</h3>
        {[['Phone',p.phone,'phone'],['Section',p.section,'building'],['Year',p.year_of_study,'school'],['Adm. No.',p.adm_no,'id-badge'],['Email',p.email,'mail']].map(([l,v,i])=>v&&(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:C.bg3, borderRadius:8, marginBottom:8 }}>
            <i className={`ti ti-${i}`} style={{ color:C.text3, fontSize:16, flexShrink:0 }}/>
            <div><div style={{ fontSize:11, color:C.text3, fontWeight:600, textTransform:'uppercase' }}>{l}</div><div style={{ fontSize:13, color:C.text }}>{v}</div></div>
          </div>
        ))}
        {!p.phone && !p.section && !p.adm_no && <p style={{ color:C.text3, fontSize:13 }}>No contact info yet. Click Edit Profile to add your details.</p>}
      </Card>

      <Card>
        <h3 style={{ fontWeight:700, color:C.text, marginBottom:12 }}>My Skills</h3>
        {(p.skills||[]).length === 0
          ? <p style={{ color:C.text3, fontSize:13 }}>No skills added yet. Click Edit Profile to add your skills.</p>
          : <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{p.skills.map(s=><Badge key={s} label={s} color="blue"/>)}</div>
        }
      </Card>

      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem', backdropFilter:'blur(4px)' }}>
          <div style={{ background:C.bg2, border:`1px solid ${C.border2}`, borderRadius:14, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', padding:'1.5rem', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontWeight:700, color:C.text }}>Edit Profile</h3>
              <button onClick={()=>setEditing(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3, fontSize:20 }}><i className="ti ti-x"/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Inp label="Full Name" value={form.full_name} onChange={v=>setForm({...form,full_name:v})} placeholder="Your full name"/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Inp label="Department / Section" value={form.section} onChange={v=>setForm({...form,section:v})} placeholder="e.g. ICT"/>
                <Inp label="Phone" value={form.phone} onChange={v=>setForm({...form,phone:v})} placeholder="254XXXXXXXXX"/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Year of Study</label>
                <select value={form.year_of_study} onChange={e=>setForm({...form,year_of_study:e.target.value})} style={{ width:'100%', padding:'9px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:'inherit' }}>
                  <option value="">Select year…</option>
                  {YEARS.map(y=><option key={y}>{y}</option>)}
                </select>
              </div>
              <Txt label="Bio" value={form.bio} onChange={v=>setForm({...form,bio:v})} placeholder="Tell the club about yourself…" rows={3}/>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:8 }}>Skills (tap to select)</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {SKILLS.map(s=>(
                    <button key={s} onClick={()=>toggleSkill(s)} style={{ padding:'5px 13px', borderRadius:99, border:`1px solid ${form.skills.includes(s)?C.primary:C.border}`, background:form.skills.includes(s)?C.primaryBg:'transparent', color:form.skills.includes(s)?C.primary2:C.text3, cursor:'pointer', fontSize:12, fontWeight:500, fontFamily:'inherit', transition:'all 0.15s' }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop:'1.25rem', display:'flex', gap:10, justifyContent:'flex-end' }}>
              <Btn onClick={()=>setEditing(false)}>Cancel</Btn>
              <Btn variant="primary" icon="device-floppy" onClick={save} disabled={saving}>{saving?'Saving…':'Save Profile'}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Btn, Inp, Sel, Txt, Card, Modal, Confirm, useToast, C } from '../components/UI';

const ROLE_C   = { admin:'red', editor:'amber', mentor:'teal', member:'blue' };
const ACT_C    = { ADD_MEMBER:'green',EDIT_MEMBER:'blue',DELETE_MEMBER:'red',ADD_PROJECT:'green',ADD_IDEA:'teal',CHANGE_ROLE:'amber',ADD_EVENT:'green',DELETE_ANNOUNCEMENT:'red',UPDATE_PATRON:'teal',ADD_MENTOR:'green',DELETE_MENTOR:'red',LOGIN:'gray',ADD_MEETING:'green' };

export default function AdminPanel() {
  const { profile: me, isAdmin } = useAuth();
  const { show, Toasts } = useToast();
  const [tab,      setTab]      = useState('users');
  const [profiles, setProfiles] = useState([]);
  const [audit,    setAudit]    = useState([]);
  const [patron,   setPatron]   = useState(null);
  const [rules,    setRules]    = useState([]);
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [pForm,    setPForm]    = useState({ full_name:'', phone:'', email:'', bio:'' });
  const [saving,   setSaving]   = useState(false);
  const [delUser,  setDelUser]  = useState(null);
  const [pwModal,  setPwModal]  = useState(false);
  const [pwForm,   setPwForm]   = useState({ nw:'', nw2:'' });
  const [search,   setSearch]   = useState('');

  if (!isAdmin) return (
    <div style={{ textAlign:'center', padding:'4rem' }}>
      <i className="ti ti-lock" style={{ fontSize:48, color:C.text3, display:'block', marginBottom:12 }} />
      <p style={{ color:C.text2, fontSize:16 }}>Admin access required</p>
    </div>
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, aRes, patRes, rRes, repRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('audit_log').select('*').order('created_at',{ascending:false}).limit(100),
      supabase.from('patron').select('*').single(),
      supabase.from('points_rules').select('*').order('points',{ascending:false}),
      supabase.from('idea_reports').select('*,ideas(title)').eq('is_resolved',false).order('created_at',{ascending:false}),
    ]);
    setProfiles(pRes.data||[]);
    setAudit(aRes.data||[]);
    setReports(repRes.data||[]);
    setRules(rRes.data||[]);
    if (patRes.data) {
      setPatron(patRes.data);
      setPForm({ full_name:patRes.data.full_name||'', phone:patRes.data.phone||'', email:patRes.data.email||'', bio:patRes.data.bio||'' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Role change ── */
  async function updateRole(profileId, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId);
    if (error) return show(error.message, 'error');
    setProfiles(ps => ps.map(p => p.id === profileId ? { ...p, role } : p));
    await logAudit('CHANGE_ROLE','profiles',profileId,me?.full_name,`Role changed to ${role}`);
    show(`Role updated to ${role}`);
  }

  /* ── Points ── */
  async function updatePoints(profileId, delta) {
    const p = profiles.find(x => x.id === profileId);
    const newPts = Math.max(0, (p?.points||0) + delta);
    const { error } = await supabase.from('profiles').update({ points: newPts }).eq('id', profileId);
    if (error) return show(error.message,'error');
    setProfiles(ps => ps.map(x => x.id === profileId ? { ...x, points:newPts } : x));
    show(`Points ${delta > 0 ? 'added ✅' : 'deducted'}`);
  }

  /* ── Update points rule ── */
  async function updateRule(id, points) {
    await supabase.from('points_rules').update({ points: Number(points) }).eq('id', id);
    setRules(rs => rs.map(r => r.id === id ? { ...r, points: Number(points) } : r));
    show('Points rule updated');
  }

  /* ── Patron ── */
  async function savePatron() {
    setSaving(true);
    try {
      let res;
      if (patron) {
        const { data } = await supabase.from('patron').update(pForm).eq('id', patron.id).select().single();
        res = data;
      } else {
        const { data } = await supabase.from('patron').insert(pForm).select().single();
        res = data;
      }
      setPatron(res);
      await logAudit('UPDATE_PATRON','patron',res.id,me?.full_name);
      show('Patron info updated ✅');
    } catch(ex) { show(ex.message,'error'); }
    setSaving(false);
  }

  /* ── Deactivate user ── */
  async function deactivateUser(p) {
    await supabase.from('profiles').update({ is_active:false }).eq('id', p.id);
    setProfiles(ps => ps.map(x => x.id === p.id ? { ...x, is_active:false } : x));
    await logAudit('DEACTIVATE_USER','profiles',p.id,me?.full_name);
    show('User deactivated'); setDelUser(null);
  }

  /* ── Resolve report ── */
  async function resolveReport(id) {
    await supabase.from('idea_reports').update({ is_resolved:true }).eq('id', id);
    setReports(rs => rs.filter(r => r.id !== id));
    show('Report resolved');
  }

  /* ── Password change ── */
  async function changePassword() {
    if (pwForm.nw !== pwForm.nw2) return show('Passwords do not match','error');
    if (pwForm.nw.length < 6) return show('Minimum 6 characters','error');
    const { error } = await supabase.auth.updateUser({ password: pwForm.nw });
    if (error) return show(error.message,'error');
    show('Password changed successfully ✅');
    setPwModal(false); setPwForm({ nw:'', nw2:'' });
  }

  const filtered = profiles.filter(p =>
    !search || p.full_name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    ['users',   'Users & Roles',   'users'],
    ['points',  'Points & Rules',  'star'],
    ['patron',  'Patron',          'user-star'],
    ['reports', 'Reports',         'alert-triangle'],
    ['audit',   'Audit Log',       'clipboard-list'],
  ];

  return (
    <div>
      <Toasts />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', gap:10, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>⚙️ Admin Panel</h2>
          <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>System administration and control</p>
        </div>
        <Btn size="sm" icon="key" onClick={() => setPwModal(true)}>Change My Password</Btn>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', background:C.bg3, borderRadius:8, padding:4, marginBottom:'1.5rem', flexWrap:'wrap', gap:2 }}>
        {TABS.map(([t,l,i]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'7px 16px', borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', background:tab===t?C.surface:'transparent', color:tab===t?C.text:C.text3, transition:'all 0.15s', display:'flex', alignItems:'center', gap:6 }}>
            <i className={`ti ti-${i}`} style={{ fontSize:15 }} />{l}
            {t==='reports' && reports.length>0 && <span style={{ background:C.danger, color:'#fff', borderRadius:99, fontSize:10, fontWeight:700, minWidth:16, height:16, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{reports.length}</span>}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div>
          <div style={{ marginBottom:12 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users by name or email…"
              style={{ width:'100%', padding:'9px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit', outline:'none' }} />
          </div>

          <Card style={{ padding:0, overflow:'hidden', marginBottom:16 }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:C.bg3 }}>
                    {['User','Section','Role','Points','Status','Actions'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id} style={{ borderTop:`1px solid ${C.border}`, opacity: p.is_active===false ? 0.5 : 1 }}>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <Avatar name={p.full_name||p.email||'?'} size={34} section={p.section} url={p.avatar_url} />
                          <div>
                            <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{p.full_name||'(no name)'}</div>
                            <div style={{ fontSize:11, color:C.text3 }}>{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:13, color:C.text2 }}>{p.section||'—'}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <select value={p.role} onChange={e => updateRole(p.id, e.target.value)}
                          disabled={p.id === me?.id && p.role==='admin'}
                          style={{ padding:'4px 8px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
                          {['admin','editor','mentor','member'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <button onClick={() => updatePoints(p.id,-10)} style={{ background:C.dangerBg, border:'none', color:C.danger, borderRadius:4, cursor:'pointer', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14 }}>−</button>
                          <span style={{ fontWeight:700, color:C.primary2, minWidth:36, textAlign:'center' }}>{p.points||0}</span>
                          <button onClick={() => updatePoints(p.id,10)} style={{ background:C.successBg, border:'none', color:C.success, borderRadius:4, cursor:'pointer', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14 }}>+</button>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <Badge label={p.is_active!==false?'Active':'Inactive'} color={p.is_active!==false?'green':'gray'} dot />
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        {p.id !== me?.id && p.role !== 'admin' && p.is_active!==false && (
                          <Btn size="sm" danger icon="user-off" onClick={() => setDelUser(p)}>Deactivate</Btn>
                        )}
                        {p.id === me?.id && <span style={{ fontSize:12, color:C.text3, fontStyle:'italic' }}>You</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Role legend */}
          <Card>
            <h3 style={{ fontWeight:700, color:C.text, marginBottom:10 }}>Role Permissions</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
              {[['admin','Full access — can do everything','red'],['editor','Can add/edit all content','amber'],['mentor','Can review and approve ideas','teal'],['member','Read-only + submit ideas','blue']].map(([r,d,c]) => (
                <div key={r} style={{ padding:'10px 14px', background:C.bg3, borderRadius:8 }}>
                  <Badge label={r} color={c} />
                  <p style={{ fontSize:12, color:C.text3, marginTop:6 }}>{d}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── POINTS & RULES TAB ── */}
      {tab === 'points' && (
        <div>
          <p style={{ color:C.text3, fontSize:13, marginBottom:16 }}>Configure how many points members earn for each action. Changes take effect immediately.</p>
          <Card style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.bg3 }}>
                  {['Action','Description','Points',''].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r, i) => (
                  <tr key={r.id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:'12px 14px', fontWeight:600, fontSize:13, color:C.text }}>{r.action.replace(/_/g,' ')}</td>
                    <td style={{ padding:'12px 14px', fontSize:13, color:C.text2 }}>{r.label}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <input type="number" defaultValue={r.points} min={0} max={999}
                        onBlur={e => updateRule(r.id, e.target.value)}
                        style={{ width:70, padding:'5px 8px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontSize:13, fontFamily:'inherit', textAlign:'center' }} />
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <Badge label={r.is_active?'Active':'Off'} color={r.is_active?'green':'gray'} />
                    </td>
                  </tr>
                ))}
                {rules.length===0 && <tr><td colSpan={4} style={{ padding:'2rem', textAlign:'center', color:C.text3 }}>No rules found. Make sure you ran the SQL update.</td></tr>}
              </tbody>
            </table>
          </Card>

          {/* Manually award badge */}
          <Card style={{ marginTop:16 }}>
            <h3 style={{ fontWeight:700, color:C.text, marginBottom:12 }}>Manually Award a Badge</h3>
            <AwardBadge profiles={profiles} show={show} />
          </Card>
        </div>
      )}

      {/* ── PATRON TAB ── */}
      {tab === 'patron' && (
        <Card style={{ maxWidth:540 }}>
          <h3 style={{ fontWeight:700, color:C.text, marginBottom:16 }}>Club Patron Details</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Inp label="Full Name" value={pForm.full_name} onChange={v=>setPForm({...pForm,full_name:v})} required />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Inp label="Phone" value={pForm.phone} onChange={v=>setPForm({...pForm,phone:v})} placeholder="254XXXXXXXXX" />
              <Inp label="Email" value={pForm.email} onChange={v=>setPForm({...pForm,email:v})} type="email" />
            </div>
            <Txt label="Bio" value={pForm.bio} onChange={v=>setPForm({...pForm,bio:v})} rows={3} placeholder="Short bio…" />
          </div>
          <div style={{ marginTop:16 }}>
            <Btn variant="primary" icon="device-floppy" onClick={savePatron} disabled={saving}>{saving?'Saving…':'Save Patron Info'}</Btn>
          </div>
        </Card>
      )}

      {/* ── REPORTS TAB ── */}
      {tab === 'reports' && (
        <div>
          <p style={{ color:C.text3, fontSize:13, marginBottom:16 }}>Ideas flagged by members for review. Resolve each one after taking action.</p>
          {reports.length === 0
            ? <Card><div style={{ textAlign:'center', padding:'2rem', color:C.text3 }}>✅ No unresolved reports — all clear!</div></Card>
            : reports.map(r => (
              <Card key={r.id} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                  <div>
                    <div style={{ fontWeight:600, color:C.danger, fontSize:14, marginBottom:4 }}>⚠️ Reported idea: {r.ideas?.title||'(deleted)'}</div>
                    <div style={{ fontSize:13, color:C.text2 }}><strong>Reason:</strong> {r.reason}</div>
                    <div style={{ fontSize:11, color:C.text3, marginTop:4 }}>{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <Btn size="sm" variant="primary" icon="check" onClick={() => resolveReport(r.id)}>Resolve</Btn>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* ── AUDIT LOG TAB ── */}
      {tab === 'audit' && (
        <Card style={{ padding:0, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.bg3 }}>
                  {['Time','Action','Entity','Performed By','Details'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit.map((a, i) => (
                  <tr key={a.id} style={{ borderTop:`1px solid ${C.border}` }}>
                    <td style={{ padding:'10px 14px', fontSize:12, color:C.text3, whiteSpace:'nowrap' }}>{new Date(a.created_at).toLocaleString()}</td>
                    <td style={{ padding:'10px 14px' }}><Badge label={a.action.replace(/_/g,' ')} color={ACT_C[a.action]||'gray'} /></td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:C.text2 }}>{a.entity}{a.entity_id?` #${a.entity_id}`:''}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:C.text }}>{a.performed_by||'—'}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:C.text3 }}>{a.details||'—'}</td>
                  </tr>
                ))}
                {audit.length===0 && <tr><td colSpan={5} style={{ padding:'3rem', textAlign:'center', color:C.text3 }}>No audit records yet</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Change password modal */}
      {pwModal && (
        <Modal title="Change My Password" onClose={() => setPwModal(false)} width={400}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Inp label="New Password" value={pwForm.nw} onChange={v=>setPwForm({...pwForm,nw:v})} type="password" placeholder="Min 6 characters" />
            <Inp label="Confirm New Password" value={pwForm.nw2} onChange={v=>setPwForm({...pwForm,nw2:v})} type="password" placeholder="Repeat new password" />
          </div>
          <div style={{ marginTop:'1.25rem', display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn onClick={() => setPwModal(false)}>Cancel</Btn>
            <Btn variant="primary" icon="key" onClick={changePassword}>Change Password</Btn>
          </div>
        </Modal>
      )}

      {delUser && <Confirm message={`Deactivate account for ${delUser.full_name}? They will lose access to the system.`} onConfirm={() => deactivateUser(delUser)} onCancel={() => setDelUser(null)} />}
    </div>
  );
}

/* ── Award Badge sub-component ─────────────────────── */
function AwardBadge({ profiles, show }) {
  const BADGES = ['pioneer','innovator','builder','top_voter','collaborator','trending','mentor_pick'];
  const [userId,  setUserId]  = useState('');
  const [badge,   setBadge]   = useState('innovator');
  const [saving,  setSaving]  = useState(false);

  async function award() {
    if (!userId) return show('Select a user first','error');
    setSaving(true);
    const p = profiles.find(x => x.id === userId);
    const current = p?.badges||[];
    if (current.includes(badge)) { show('User already has this badge','warning'); setSaving(false); return; }
    await supabase.from('profiles').update({ badges:[...current,badge] }).eq('id',userId);
    await supabase.from('notifications').insert({ user_id:userId, message:`🏅 You were awarded the "${badge}" badge by Admin!`, type:'points' });
    show(`Badge awarded to ${p?.full_name}! 🏅`);
    setSaving(false);
  }

  return (
    <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
      <div style={{ flex:1, minWidth:180 }}>
        <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Member</label>
        <select value={userId} onChange={e=>setUserId(e.target.value)} style={{ width:'100%', padding:'9px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit' }}>
          <option value="">Select member…</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name||p.email}</option>)}
        </select>
      </div>
      <div style={{ flex:1, minWidth:160 }}>
        <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Badge</label>
        <select value={badge} onChange={e=>setBadge(e.target.value)} style={{ width:'100%', padding:'9px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit' }}>
          {BADGES.map(b => <option key={b} value={b}>{b.replace(/_/g,' ')}</option>)}
        </select>
      </div>
      <Btn variant="accent" icon="award" onClick={award} disabled={saving}>{saving?'Awarding…':'Award Badge'}</Btn>
    </div>
  );
}

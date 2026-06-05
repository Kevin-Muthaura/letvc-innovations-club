import { useEffect, useState, useCallback } from 'react';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Btn, Inp, Sel, Card, Modal, Confirm, Empty, useToast, C } from '../components/UI';

const ROLE_C = { admin:'red', editor:'amber', mentor:'teal', member:'blue' };
const BLANK_USER = { full_name:'', email:'', role:'member', section:'', phone:'' };

export default function AdminPanel() {
  const { profile: myProfile, isAdmin } = useAuth();
  const { show, Toasts } = useToast();
  const [tab, setTab]     = useState('users');
  const [profiles, setProfiles] = useState([]);
  const [audit,    setAudit]    = useState([]);
  const [patron,   setPatron]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [form,     setForm]     = useState(BLANK_USER);
  const [pForm,    setPForm]    = useState({ full_name:'', phone:'', email:'', bio:'' });
  const [saving,   setSaving]   = useState(false);
  const [delUser,  setDelUser]  = useState(null);
  const [pwForm,   setPwForm]   = useState({ cur:'', nw:'', nw2:'' });
  const [pwModal,  setPwModal]  = useState(false);

  if (!isAdmin) return (
    <div style={{ textAlign:'center', padding:'4rem' }}>
      <i className="ti ti-lock" style={{ fontSize:48, color:C.text3, display:'block', marginBottom:12 }} />
      <p style={{ color:C.text2, fontSize:16 }}>Admin access required</p>
    </div>
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, aRes, patRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('audit_log').select('*').order('created_at',{ascending:false}).limit(80),
      supabase.from('patron').select('*').single(),
    ]);
    setProfiles(pRes.data || []);
    setAudit(aRes.data || []);
    setPatron(patRes.data);
    if (patRes.data) setPForm({ full_name:patRes.data.full_name||'', phone:patRes.data.phone||'', email:patRes.data.email||'', bio:patRes.data.bio||'' });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateRole(profileId, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId);
    if (error) return show(error.message,'error');
    setProfiles(ps => ps.map(p => p.id === profileId ? { ...p, role } : p));
    await logAudit('CHANGE_ROLE','profiles',profileId,myProfile?.full_name,`Role changed to ${role}`);
    show(`Role updated to ${role}`);
  }

  async function updatePoints(profileId, delta) {
    const p = profiles.find(x => x.id === profileId);
    const newPts = Math.max(0, (p?.points || 0) + delta);
    const { error } = await supabase.from('profiles').update({ points: newPts }).eq('id', profileId);
    if (error) return show(error.message,'error');
    setProfiles(ps => ps.map(x => x.id === profileId ? { ...x, points:newPts } : x));
    show(`Points ${delta > 0 ? 'added' : 'deducted'}`);
  }

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
      await logAudit('UPDATE_PATRON','patron',res.id,myProfile?.full_name);
      show('Patron info updated');
    } catch (ex) { show(ex.message,'error'); }
    setSaving(false);
  }

  async function deactivateUser(p) {
    const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', p.id);
    if (error) return show(error.message,'error');
    setProfiles(ps => ps.map(x => x.id === p.id ? { ...x, is_active:false } : x));
    await logAudit('DEACTIVATE_USER','profiles',p.id,myProfile?.full_name);
    show('User deactivated'); setDelUser(null);
  }

  const ACT_C = { ADD_MEMBER:'green', EDIT_MEMBER:'blue', DELETE_MEMBER:'red', ADD_PROJECT:'green', ADD_IDEA:'teal', CHANGE_ROLE:'amber', ADD_EVENT:'green', DELETE_ANNOUNCEMENT:'red', UPDATE_PATRON:'teal', ADD_MENTOR:'green', DELETE_MENTOR:'red', LOGIN:'gray' };

  return (
    <div>
      <Toasts />
      <div style={{ marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>⚙️ Admin Panel</h2>
        <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>System administration and control</p>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', background:C.bg3, borderRadius:8, padding:4, marginBottom:'1.5rem', flexWrap:'wrap', gap:2 }}>
        {[['users','Users & Roles','users'],['patron','Patron','user-star'],['audit','Audit Log','clipboard-list']].map(([t,l,i]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'7px 18px', borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', background:tab===t?C.surface:'transparent', color:tab===t?C.text:C.text3, transition:'all 0.15s', display:'flex', alignItems:'center', gap:6 }}>
            <i className={`ti ti-${i}`} />{l}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ color:C.text3, fontSize:13 }}>{profiles.length} registered users · Click role badge to change</p>
            <Btn size="sm" icon="key" onClick={() => setPwModal(true)}>Change My Password</Btn>
          </div>
          <Card style={{ padding:0, overflow:'hidden' }}>
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
                  {profiles.map((p, i) => (
                    <tr key={p.id} style={{ borderTop:`1px solid ${C.border}` }}>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <Avatar name={p.full_name||p.email||'?'} size={34} section={p.section} />
                          <div>
                            <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{p.full_name||'(no name)'}</div>
                            <div style={{ fontSize:12, color:C.text3 }}>{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:13, color:C.text2 }}>{p.section||'—'}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <select value={p.role} onChange={e => updateRole(p.id, e.target.value)} disabled={p.id === myProfile?.id && p.role==='admin'}
                          style={{ padding:'4px 8px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6, color:C.text, fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
                          {['admin','editor','mentor','member'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <button onClick={() => updatePoints(p.id,-10)} style={{ background:C.dangerBg, border:'none', color:C.danger, borderRadius:4, cursor:'pointer', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14 }}>−</button>
                          <span style={{ fontWeight:700, color:C.primary2, minWidth:32, textAlign:'center' }}>{p.points||0}</span>
                          <button onClick={() => updatePoints(p.id,10)} style={{ background:C.successBg, border:'none', color:C.success, borderRadius:4, cursor:'pointer', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14 }}>+</button>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <Badge label={p.is_active!==false?'Active':'Inactive'} color={p.is_active!==false?'green':'gray'} dot />
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        {p.id !== myProfile?.id && p.role !== 'admin' && (
                          <Btn size="sm" danger icon="user-off" onClick={() => setDelUser(p)}>Deactivate</Btn>
                        )}
                        {p.id === myProfile?.id && <span style={{ fontSize:12, color:C.text3 }}>(You)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card style={{ marginTop:16 }}>
            <h3 style={{ fontWeight:700, color:C.text, marginBottom:10 }}>Role Permissions</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
              {[['admin','Full access — can do everything','red'],['editor','Can add/edit all content','amber'],['mentor','Read access + post updates','teal'],['member','Read-only access','blue']].map(([r,d,c]) => (
                <div key={r} style={{ padding:'10px 14px', background:C.bg3, borderRadius:8 }}>
                  <Badge label={r} color={c} />
                  <p style={{ fontSize:12, color:C.text3, marginTop:6 }}>{d}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── PATRON TAB ── */}
      {tab === 'patron' && (
        <Card style={{ maxWidth:540 }}>
          <h3 style={{ fontWeight:700, color:C.text, marginBottom:16 }}>Club Patron Details</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Inp label="Full Name" value={pForm.full_name} onChange={v => setPForm({...pForm, full_name:v})} placeholder="PATRON NAME" required />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Inp label="Phone" value={pForm.phone} onChange={v => setPForm({...pForm, phone:v})} placeholder="254XXXXXXXXX" />
              <Inp label="Email" value={pForm.email} onChange={v => setPForm({...pForm, email:v})} type="email" />
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Bio</label>
              <textarea value={pForm.bio} onChange={e => setPForm({...pForm, bio:e.target.value})} rows={3} placeholder="Short bio or description…" style={{ width:'100%', padding:'9px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:'inherit', resize:'vertical', outline:'none' }} />
            </div>
          </div>
          <div style={{ marginTop:16 }}>
            <Btn variant="primary" icon="device-floppy" onClick={savePatron} disabled={saving}>{saving?'Saving…':'Save Patron Info'}</Btn>
          </div>
        </Card>
      )}

      {/* ── AUDIT TAB ── */}
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
            <Inp label="New Password" value={pwForm.nw} onChange={v => setPwForm({...pwForm, nw:v})} type="password" placeholder="Min 6 characters" />
            <Inp label="Confirm New Password" value={pwForm.nw2} onChange={v => setPwForm({...pwForm, nw2:v})} type="password" placeholder="Repeat new password" />
          </div>
          <div style={{ marginTop:'1.25rem', display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn onClick={() => setPwModal(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={async () => {
              if (pwForm.nw !== pwForm.nw2) return show('Passwords do not match','error');
              if (pwForm.nw.length < 6) return show('Minimum 6 characters','error');
              const { error } = await supabase.auth.updateUser({ password: pwForm.nw });
              if (error) return show(error.message,'error');
              show('Password changed successfully'); setPwModal(false); setPwForm({ cur:'', nw:'', nw2:'' });
            }}>Change Password</Btn>
          </div>
        </Modal>
      )}

      {delUser && <Confirm message={`Deactivate account for ${delUser.full_name}? They will lose access to the system.`} onConfirm={() => deactivateUser(delUser)} onCancel={() => setDelUser(null)} />}
    </div>
  );
}

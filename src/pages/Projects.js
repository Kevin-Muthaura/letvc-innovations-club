import { useEffect, useState, useCallback } from 'react';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Btn, Inp, Sel, Txt, Card, Modal, Confirm, ProgressBar, Empty, useToast, C } from '../components/UI';

const STAGES = ['Ideation','Research','Prototype','Testing','Exhibition Ready','Completed'];
const STAGE_C = { Ideation:'blue', Research:'purple', Prototype:'amber', Testing:'teal', 'Exhibition Ready':'green', Completed:'gray' };
const STATUS_C = { active:'green', paused:'amber', completed:'gray' };
const BLANK    = { title:'', description:'', department:'', stage:'Ideation', status:'active', progress:0, tech_stack:'', demo_link:'', github_link:'', mentor_id:'' };

export default function Projects() {
  const { isAdmin, profile } = useAuth();
  const { show, Toasts }     = useToast();
  const [projects, setProjects]= useState([]);
  const [members,  setMembers] = useState([]);
  const [mentors,  setMentors] = useState([]);
  const [loading,  setLoading] = useState(true);
  const [modal,    setModal]   = useState(null);
  const [form,     setForm]    = useState(BLANK);
  const [teamIds,  setTeamIds] = useState([]);
  const [saving,   setSaving]  = useState(false);
  const [delPrj,   setDelPrj]  = useState(null);
  const [selected, setSelected]= useState(null);
  const [upText,   setUpText]  = useState('');
  const [filter,   setFilter]  = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, mRes, mentRes] = await Promise.all([
      supabase.from('projects').select(`*,project_members(member_id,members(id,full_name,section,avatar_url)),project_updates(id,content,author_name,created_at),mentors(full_name,technical_area)`).order('updated_at',{ascending:false}),
      supabase.from('members').select('id,full_name,section,avatar_url').eq('status','active').order('full_name'),
      supabase.from('mentors').select('id,full_name,technical_area').eq('is_active',true),
    ]);
    setProjects(pRes.data||[]); setMembers(mRes.data||[]); setMentors(mentRes.data||[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setForm(BLANK); setTeamIds([]); setModal('add'); }
  function openEdit(p) {
    setForm({ title:p.title, description:p.description, department:p.department, stage:p.stage, status:p.status, progress:p.progress, tech_stack:p.tech_stack||'', demo_link:p.demo_link||'', github_link:p.github_link||'', mentor_id:p.mentor_id||'' });
    setTeamIds((p.project_members||[]).map(pm=>pm.member_id));
    setModal({ type:'edit', id:p.id });
  }

  async function save() {
    if (!form.title.trim()) return show('Project title required','error');
    setSaving(true);
    try {
      const payload = { ...form, mentor_id: form.mentor_id||null, progress: Number(form.progress) };
      if (modal==='add') {
        const { data } = await supabase.from('projects').insert(payload).select().single();
        if (teamIds.length) await supabase.from('project_members').insert(teamIds.map(mid=>({ project_id:data.id, member_id:mid })));
        await logAudit('ADD_PROJECT','projects',data.id,profile?.full_name,`Added: ${data.title}`);
        show('Project created!');
      } else {
        const { data } = await supabase.from('projects').update(payload).eq('id',modal.id).select().single();
        await supabase.from('project_members').delete().eq('project_id',modal.id);
        if (teamIds.length) await supabase.from('project_members').insert(teamIds.map(mid=>({ project_id:modal.id, member_id:mid })));
        show('Project updated');
      }
      setModal(null); load();
    } catch(ex) { show(ex.message,'error'); }
    setSaving(false);
  }

  async function doDelete() {
    await supabase.from('projects').delete().eq('id',delPrj.id);
    if (selected?.id===delPrj.id) setSelected(null);
    setProjects(ps=>ps.filter(p=>p.id!==delPrj.id));
    show('Project deleted'); setDelPrj(null);
  }

  async function postUpdate(pid) {
    if (!upText.trim()) return;
    const { data } = await supabase.from('project_updates').insert({ project_id:pid, content:upText, author_name:profile?.full_name||'Admin' }).select().single();
    setProjects(ps=>ps.map(p=>p.id===pid?{...p,project_updates:[data,...(p.project_updates||[])]}:p));
    if (selected?.id===pid) setSelected(p=>p?{...p,project_updates:[data,...(p.project_updates||[])]}:p);
    setUpText(''); show('Update posted');
  }

  async function updateProgress(pid, val) {
    const { data } = await supabase.from('projects').update({ progress:val }).eq('id',pid).select().single();
    setProjects(ps=>ps.map(p=>p.id===pid?{...p,...data}:p));
    if (selected?.id===pid) setSelected(p=>p?{...p,progress:val}:p);
  }

  const filtered = filter==='all' ? projects : projects.filter(p=>p.status===filter);

  return (
    <div>
      <Toasts />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', gap:10, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>🚀 Innovation Projects</h2>
          <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>{projects.length} project{projects.length!==1?'s':''}</p>
        </div>
        {isAdmin && <Btn variant="primary" icon="plus" onClick={openAdd}>New Project</Btn>}
      </div>

      {/* Filter pills */}
      <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
        {['all','active','paused','completed'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:'5px 14px', borderRadius:99, border:`1px solid ${filter===f?C.primary:C.border}`, background:filter===f?C.primaryBg:'transparent', color:filter===f?C.primary2:C.text3, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:'3rem', color:C.text3 }}>Loading projects…</div>}

      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 380px':'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
        <div style={{ display:selected?'flex':'grid', flexDirection:selected?'column':undefined, gridTemplateColumns:selected?undefined:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {!loading && filtered.length===0 && <Empty icon="rocket" message="No projects yet" action={isAdmin&&<Btn variant="primary" icon="plus" onClick={openAdd}>Create first project</Btn>} />}
          {filtered.map(p => (
            <Card key={p.id} onClick={()=>setSelected(sel=>sel?.id===p.id?null:p)} highlight={selected?.id===p.id} style={{ cursor:'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                <h3 style={{ fontWeight:700, fontSize:15, color:C.text }}>{p.title}</h3>
                <Badge label={p.stage} color={STAGE_C[p.stage]||'blue'} />
              </div>
              {p.description && <p style={{ fontSize:13, color:C.text2, marginBottom:10, lineHeight:1.6 }}>{p.description}</p>}
              <div style={{ fontSize:12, color:C.text3, marginBottom:10, display:'flex', gap:12, flexWrap:'wrap' }}>
                {p.department && <span><i className="ti ti-building" style={{ marginRight:3 }}/>{p.department}</span>}
                {(p.project_members?.length>0) && <span><i className="ti ti-users" style={{ marginRight:3 }}/>{p.project_members.length} member{p.project_members.length!==1?'s':''}</span>}
                <Badge label={p.status} color={STATUS_C[p.status]} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                <span style={{ color:C.text3 }}>Progress</span>
                <span style={{ fontWeight:700, color:C.text }}>{p.progress}%</span>
              </div>
              <ProgressBar value={p.progress} />
              {isAdmin && (
                <div style={{ marginTop:12, display:'flex', gap:6 }} onClick={e=>e.stopPropagation()}>
                  <Btn size="sm" icon="edit" onClick={()=>openEdit(p)}>Edit</Btn>
                  <Btn size="sm" danger icon="trash" onClick={()=>setDelPrj(p)}>Delete</Btn>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Detail pane */}
        {selected && (
          <Card style={{ position:'sticky', top:16, alignSelf:'flex-start', maxHeight:'calc(100vh - 120px)', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <h3 style={{ fontWeight:700, color:C.text }}>{selected.title}</h3>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3 }}><i className="ti ti-x"/></button>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              <Badge label={selected.stage} color={STAGE_C[selected.stage]||'blue'} />
              <Badge label={selected.status} color={STATUS_C[selected.status]} dot />
            </div>
            {selected.description && <p style={{ fontSize:14, color:C.text2, lineHeight:1.6, marginBottom:14 }}>{selected.description}</p>}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                <span style={{ color:C.text3 }}>Progress</span>
                <span style={{ fontWeight:700 }}>{selected.progress}%</span>
              </div>
              {isAdmin ? (
                <input type="range" min={0} max={100} step={5} value={selected.progress} onChange={e=>updateProgress(selected.id,Number(e.target.value))} style={{ width:'100%', accentColor:C.primary }} />
              ) : <ProgressBar value={selected.progress} />}
            </div>
            {selected.project_members?.length>0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Team</div>
                {selected.project_members.map(pm=>(
                  <div key={pm.member_id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <Avatar name={pm.members?.full_name||'?'} size={28} section={pm.members?.section} url={pm.members?.avatar_url} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{pm.members?.full_name}</div>
                      <div style={{ fontSize:11, color:C.text3 }}>{pm.members?.section}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selected.mentors && (
              <div style={{ padding:'8px 12px', background:C.bg3, borderRadius:8, marginBottom:14, fontSize:13 }}>
                <i className="ti ti-user-star" style={{ marginRight:6, color:C.accent }}/><strong style={{ color:C.text }}>Mentor:</strong> <span style={{ color:C.text2 }}>{selected.mentors.full_name}</span>
                <span style={{ color:C.text3 }}> · {selected.mentors.technical_area}</span>
              </div>
            )}
            {[['Tech Stack',selected.tech_stack,'code'],['Demo',selected.demo_link,'external-link'],['GitHub',selected.github_link,'brand-github']].map(([l,v,i])=>v&&(
              <div key={l} style={{ padding:'7px 12px', background:C.bg3, borderRadius:8, marginBottom:8, fontSize:13, display:'flex', gap:8, alignItems:'center' }}>
                <i className={`ti ti-${i}`} style={{ color:C.text3 }}/><strong style={{ color:C.text2 }}>{l}:</strong> <span style={{ color:C.text, wordBreak:'break-all' }}>{v}</span>
              </div>
            ))}
            {isAdmin && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Post Update</div>
                <textarea value={upText} onChange={e=>setUpText(e.target.value)} placeholder="Describe a milestone or update…" rows={3} style={{ width:'100%', padding:'8px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit', resize:'vertical', outline:'none' }} />
                <Btn size="sm" variant="primary" icon="send" onClick={()=>postUpdate(selected.id)} style={{ marginTop:6 }}>Post</Btn>
              </div>
            )}
            {(selected.project_updates?.length>0) && (
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Updates</div>
                {selected.project_updates.slice(0,5).map(u=>(
                  <div key={u.id} style={{ borderLeft:`3px solid ${C.primary}`, paddingLeft:10, marginBottom:10 }}>
                    <div style={{ fontSize:13, color:C.text }}>{u.content}</div>
                    <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{u.author_name} · {new Date(u.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {modal && (
        <Modal title={modal==='add'?'New Innovation Project':'Edit Project'} onClose={()=>setModal(null)} width={600}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Inp label="Project Title" value={form.title} onChange={v=>setForm({...form,title:v})} placeholder="e.g. Solar Water Purifier" required span={2} />
            <Txt label="Description" value={form.description} onChange={v=>setForm({...form,description:v})} placeholder="What problem does it solve?" rows={3} span={2} />
            <Inp label="Department" value={form.department} onChange={v=>setForm({...form,department:v})} placeholder="e.g. ELECTRICAL" />
            <Sel label="Stage" value={form.stage} onChange={v=>setForm({...form,stage:v})} options={STAGES} />
            <Sel label="Status" value={form.status} onChange={v=>setForm({...form,status:v})} options={['active','paused','completed']} />
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Progress: {form.progress}%</label>
              <input type="range" min={0} max={100} step={5} value={form.progress} onChange={e=>setForm({...form,progress:Number(e.target.value)})} style={{ width:'100%', accentColor:C.primary }} />
            </div>
            <Inp label="Tech Stack" value={form.tech_stack} onChange={v=>setForm({...form,tech_stack:v})} placeholder="e.g. Arduino, React" />
            <Inp label="Demo Link" value={form.demo_link} onChange={v=>setForm({...form,demo_link:v})} placeholder="https://…" />
            <Inp label="GitHub Link" value={form.github_link} onChange={v=>setForm({...form,github_link:v})} placeholder="https://github.com/…" />
            <Sel label="Assign Mentor" value={form.mentor_id} onChange={v=>setForm({...form,mentor_id:v})}
              options={[{value:'',label:'No mentor assigned'}, ...mentors.map(m=>({value:m.id, label:`${m.full_name} (${m.technical_area})`}))]} />
            <div style={{ gridColumn:'span 2' }}>
              <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:8 }}>Team Members</label>
              <div style={{ border:`1px solid ${C.border}`, borderRadius:8, maxHeight:180, overflowY:'auto', padding:8 }}>
                {members.map(m=>(
                  <label key={m.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 6px', cursor:'pointer', borderRadius:6, background:teamIds.includes(m.id)?C.primaryBg:'transparent' }}>
                    <input type="checkbox" checked={teamIds.includes(m.id)} onChange={e=>setTeamIds(ids=>e.target.checked?[...ids,m.id]:ids.filter(i=>i!==m.id))} />
                    <Avatar name={m.full_name} size={22} section={m.section} url={m.avatar_url} />
                    <span style={{ fontSize:13, color:C.text }}>{m.full_name}</span>
                    <span style={{ fontSize:11, color:C.text3, marginLeft:'auto' }}>{m.section}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop:'1.25rem', display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="primary" icon="device-floppy" onClick={save} disabled={saving}>{saving?'Saving…':'Save Project'}</Btn>
          </div>
        </Modal>
      )}

      {delPrj && <Confirm message={`Delete project "${delPrj.title}"? All team assignments and updates will be deleted.`} onConfirm={doDelete} onCancel={()=>setDelPrj(null)} />}
    </div>
  );
}

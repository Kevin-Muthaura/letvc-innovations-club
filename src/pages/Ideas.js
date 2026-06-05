import { useEffect, useState, useCallback } from 'react';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Btn, Inp, Sel, Txt, Card, Modal, Confirm, Empty, useToast, C } from '../components/UI';

const CATS = ['Technology','Business','Social Impact','Environment','Health','Education','Agriculture','Robotics','Fashion','General'];
const STAT_C = { submitted:'blue', under_review:'amber', approved:'green', rejected:'red', funded:'teal' };
const CAT_C  = { Technology:'blue', Business:'amber', 'Social Impact':'green', Environment:'teal', Health:'red', Education:'purple', Agriculture:'green', Robotics:'blue', Fashion:'purple', General:'gray' };
const BLANK  = { title:'', description:'', category:'General' };

export default function Ideas() {
  const { profile, isAdmin } = useAuth();
  const { show, Toasts }     = useToast();
  const [ideas,   setIdeas]  = useState([]);
  const [loading, setLoad]   = useState(true);
  const [myVotes, setMyVotes]= useState({});   // {idea_id: 'up'|'down'}
  const [modal,   setModal]  = useState(null);
  const [form,    setForm]   = useState(BLANK);
  const [saving,  setSaving] = useState(false);
  const [delIdea, setDelIdea]= useState(null);
  const [open,    setOpen]   = useState(null);  // idea detail id
  const [comment, setComment]= useState('');
  const [comments,setComments]=useState([]);
  const [loadC,   setLoadC]  = useState(false);
  const [filter,  setFilter] = useState('all');
  const [catF,    setCatF]   = useState('');

  const load = useCallback(async () => {
    setLoad(true);
    let q = supabase.from('ideas').select('*').order('votes_up',{ascending:false}).order('created_at',{ascending:false});
    if (filter!=='all') q = q.eq('status', filter);
    if (catF) q = q.eq('category', catF);
    const { data } = await q;
    setIdeas(data||[]);
    if (profile) {
      const { data: votes } = await supabase.from('idea_votes').select('idea_id,vote_type').eq('user_id',profile.id);
      const vm = {}; (votes||[]).forEach(v => { vm[v.idea_id]=v.vote_type; }); setMyVotes(vm);
    }
    setLoad(false);
  }, [filter, catF, profile]);

  useEffect(() => { load(); }, [load]);

  async function loadComments(ideaId) {
    setLoadC(true);
    const { data } = await supabase.from('idea_comments').select('*').eq('idea_id',ideaId).order('created_at');
    setComments(data||[]); setLoadC(false);
  }

  async function vote(idea, type) {
    if (!profile) return show('Sign in to vote','error');
    const existing = myVotes[idea.id];
    if (existing === type) {
      // un-vote
      await supabase.from('idea_votes').delete().eq('idea_id',idea.id).eq('user_id',profile.id);
      const col = type==='up'?'votes_up':'votes_down';
      await supabase.from('ideas').update({ [col]: Math.max(0,(idea[col]||0)-1) }).eq('id',idea.id);
      setMyVotes(v=>{ const nv={...v}; delete nv[idea.id]; return nv; });
      setIdeas(ids=>ids.map(i=>i.id===idea.id?{...i,[col]:Math.max(0,(i[col]||0)-1)}:i));
    } else {
      if (existing) {
        // switch vote
        await supabase.from('idea_votes').update({ vote_type:type }).eq('idea_id',idea.id).eq('user_id',profile.id);
        const add = type==='up'?'votes_up':'votes_down';
        const rem = type==='up'?'votes_down':'votes_up';
        await supabase.from('ideas').update({ [add]:(idea[add]||0)+1, [rem]:Math.max(0,(idea[rem]||0)-1) }).eq('id',idea.id);
        setMyVotes(v=>({...v,[idea.id]:type}));
        setIdeas(ids=>ids.map(i=>i.id===idea.id?{...i,[add]:(i[add]||0)+1,[rem]:Math.max(0,(i[rem]||0)-1)}:i));
      } else {
        await supabase.from('idea_votes').insert({ idea_id:idea.id, user_id:profile.id, vote_type:type });
        const col = type==='up'?'votes_up':'votes_down';
        await supabase.from('ideas').update({ [col]:(idea[col]||0)+1 }).eq('id',idea.id);
        setMyVotes(v=>({...v,[idea.id]:type}));
        setIdeas(ids=>ids.map(i=>i.id===idea.id?{...i,[col]:(i[col]||0)+1}:i));
      }
    }
  }

  async function postComment(ideaId) {
    if (!comment.trim()) return;
    const { data } = await supabase.from('idea_comments').insert({ idea_id:ideaId, user_id:profile?.id||null, author_name:profile?.full_name||'Anonymous', content:comment }).select().single();
    setComments(c=>[...c, data]); setComment('');
  }

  async function saveIdea() {
    if (!form.title.trim()||!form.description.trim()) return show('Title and description required','error');
    setSaving(true);
    try {
      if (modal==='add') {
        const { data } = await supabase.from('ideas').insert({ ...form, submitted_by:profile?.id||null, author_name:profile?.full_name||'Anonymous' }).select().single();
        setIdeas(i=>[data,...i]);
        await logAudit('ADD_IDEA','ideas',data.id,profile?.full_name,`Added: ${data.title}`);
        show('Idea submitted! 🎉');
      } else {
        const { data } = await supabase.from('ideas').update(form).eq('id',modal.id).select().single();
        setIdeas(i=>i.map(x=>x.id===modal.id?data:x));
        show('Idea updated');
      }
      setModal(null); setForm(BLANK);
    } catch(ex) { show(ex.message,'error'); }
    setSaving(false);
  }

  async function updateStatus(idea, status) {
    const { data } = await supabase.from('ideas').update({ status }).eq('id',idea.id).select().single();
    setIdeas(ids=>ids.map(i=>i.id===idea.id?data:i));
    show(`Status updated to ${status}`);
  }

  async function doDelete() {
    await supabase.from('ideas').delete().eq('id', delIdea.id);
    setIdeas(ids=>ids.filter(i=>i.id!==delIdea.id));
    if (open===delIdea.id) setOpen(null);
    show('Idea deleted'); setDelIdea(null);
  }

  const filters = ['all','submitted','under_review','approved','funded'];

  return (
    <div>
      <Toasts />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', gap:10, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>💡 Innovation Ideas</h2>
          <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>Submit ideas, vote and discuss with the club</p>
        </div>
        <Btn variant="primary" icon="plus" onClick={()=>{ setForm(BLANK); setModal('add'); }}>Submit Idea</Btn>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:'5px 14px', borderRadius:99, border:`1px solid ${filter===f?C.primary:C.border}`, background:filter===f?C.primaryBg:'transparent', color:filter===f?C.primary2:C.text3, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
            {f.replace('_',' ')}
          </button>
        ))}
        <select value={catF} onChange={e=>setCatF(e.target.value)} style={{ marginLeft:'auto', padding:'5px 10px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text2, fontSize:12, fontFamily:'inherit' }}>
          <option value="">All Categories</option>
          {CATS.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {loading && <div style={{ textAlign:'center', padding:'3rem', color:C.text3 }}>Loading ideas…</div>}
      {!loading && ideas.length===0 && <Empty icon="bulb" message="No ideas yet. Be the first to submit one!" action={<Btn variant="primary" icon="plus" onClick={()=>{ setForm(BLANK); setModal('add'); }}>Submit Idea</Btn>} />}

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {ideas.map(idea => {
          const myV = myVotes[idea.id];
          const isOpen = open===idea.id;
          return (
            <div key={idea.id} style={{ border:`1px solid ${isOpen?C.primary:C.border}`, borderRadius:12, background:C.surface, padding:'1.25rem', transition:'border-color 0.15s' }}>
              <div style={{ display:'flex', gap:12 }}>
                {/* Vote column */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:44 }}>
                  <button onClick={()=>vote(idea,'up')} style={{ background:myV==='up'?C.successBg:'transparent', border:`1px solid ${myV==='up'?C.success:C.border}`, color:myV==='up'?C.success:C.text3, borderRadius:8, padding:'6px 8px', cursor:'pointer', fontSize:18, lineHeight:1, transition:'all 0.15s' }}>▲</button>
                  <span style={{ fontWeight:800, fontSize:16, color:idea.votes_up>0?C.success:C.text2 }}>{idea.votes_up}</span>
                  <button onClick={()=>vote(idea,'down')} style={{ background:myV==='down'?C.dangerBg:'transparent', border:`1px solid ${myV==='down'?C.danger:C.border}`, color:myV==='down'?C.danger:C.text3, borderRadius:8, padding:'6px 8px', cursor:'pointer', fontSize:18, lineHeight:1, transition:'all 0.15s' }}>▼</button>
                  <span style={{ fontSize:11, color:C.text3 }}>{idea.votes_down}</span>
                </div>
                {/* Content */}
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:8 }}>
                    <h3 style={{ fontWeight:700, fontSize:16, color:C.text, cursor:'pointer' }} onClick={()=>{ const nid=isOpen?null:idea.id; setOpen(nid); if(nid) loadComments(nid); }}>{idea.title}</h3>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <Badge label={idea.category} color={CAT_C[idea.category]||'blue'} />
                      <Badge label={idea.status.replace('_',' ')} color={STAT_C[idea.status]||'gray'} />
                    </div>
                  </div>
                  <p style={{ fontSize:14, color:C.text2, lineHeight:1.6, marginBottom:10 }}>{idea.description}</p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Avatar name={idea.author_name} size={24} />
                      <span style={{ fontSize:12, color:C.text3 }}>{idea.author_name} · {new Date(idea.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <Btn size="sm" icon="message-circle" onClick={()=>{ const nid=isOpen?null:idea.id; setOpen(nid); if(nid) loadComments(nid); }}>
                        {isOpen?'Hide':'Comments'}
                      </Btn>
                      {(isAdmin||idea.submitted_by===profile?.id) && <>
                        <Btn size="sm" icon="edit" onClick={()=>{ setForm({title:idea.title,description:idea.description,category:idea.category}); setModal({id:idea.id}); }}>Edit</Btn>
                        <Btn size="sm" danger icon="trash" onClick={()=>setDelIdea(idea)}>Del</Btn>
                      </>}
                      {isAdmin && (
                        <select value={idea.status} onChange={e=>updateStatus(idea,e.target.value)} style={{ padding:'3px 8px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6, color:C.text2, fontSize:12, fontFamily:'inherit', cursor:'pointer' }}>
                          {['submitted','under_review','approved','rejected','funded'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  {/* Comments section */}
                  {isOpen && (
                    <div style={{ marginTop:14, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
                      {loadC ? <span style={{ color:C.text3, fontSize:13 }}>Loading comments…</span> :
                        comments.length===0 ? <span style={{ color:C.text3, fontSize:13 }}>No comments yet. Start the discussion!</span> :
                        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
                          {comments.map(cm=>(
                            <div key={cm.id} style={{ display:'flex', gap:10 }}>
                              <Avatar name={cm.author_name} size={28} />
                              <div style={{ background:C.bg3, borderRadius:8, padding:'8px 12px', flex:1 }}>
                                <div style={{ fontSize:12, fontWeight:600, color:C.primary2, marginBottom:3 }}>{cm.author_name}</div>
                                <div style={{ fontSize:14, color:C.text2 }}>{cm.content}</div>
                                <div style={{ fontSize:11, color:C.text3, marginTop:3 }}>{new Date(cm.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      }
                      <div style={{ display:'flex', gap:8, marginTop:8 }}>
                        <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add a comment…" onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&postComment(idea.id)} style={{ flex:1, padding:'8px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit', outline:'none' }} />
                        <Btn size="sm" variant="primary" icon="send" onClick={()=>postComment(idea.id)}>Post</Btn>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit/edit modal */}
      {modal && (
        <Modal title={modal==='add'?'Submit New Idea':'Edit Idea'} onClose={()=>setModal(null)} width={560}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Inp label="Idea Title" value={form.title} onChange={v=>setForm({...form,title:v})} placeholder="Give your idea a catchy title" required />
            <Txt label="Description" value={form.description} onChange={v=>setForm({...form,description:v})} placeholder="Describe the problem and your solution…" rows={5} required />
            <Sel label="Category" value={form.category} onChange={v=>setForm({...form,category:v})} options={CATS} />
          </div>
          <div style={{ marginTop:'1.25rem', display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="primary" icon="send" onClick={saveIdea} disabled={saving}>{saving?'Submitting…':'Submit Idea'}</Btn>
          </div>
        </Modal>
      )}

      {delIdea && <Confirm message={`Delete idea "${delIdea.title}"? All votes and comments will also be deleted.`} onConfirm={doDelete} onCancel={()=>setDelIdea(null)} />}
    </div>
  );
}

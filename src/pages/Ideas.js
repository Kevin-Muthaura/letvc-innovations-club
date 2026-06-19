import{useEffect,useState,useCallback}from'react';
import{supabase,logAudit}from'../lib/supabase';
import{useAuth}from'../context/AuthContext';
import{Avatar,Badge,Btn,Inp,Sel,Txt,Card,Modal,Confirm,Empty,useToast,C}from'../components/UI';
const CATS=['Technology','Business','Social Impact','Environment','Health','Education','Agriculture','Robotics','Fashion','General'];
const STAT_C={submitted:'blue',under_review:'amber',approved:'green',rejected:'red',funded:'teal'};
const CAT_C={Technology:'blue',Business:'amber','Social Impact':'green',Environment:'teal',Health:'red',Education:'purple',Agriculture:'green',Robotics:'blue',Fashion:'purple',General:'gray'};
const LC=['submitted','under_review','approved','funded'];
const LC_L={submitted:'💡 Idea',under_review:'🔍 Review',approved:'✅ Approved',funded:'🚀 Funded'};
const BLANK={title:'',description:'',category:'General'};
export default function Ideas(){
  const{profile,isAdmin}=useAuth();
  const{show,Toasts}=useToast();
  const isMentor=profile?.role==='mentor'||isAdmin;
  const[ideas,setIdeas]=useState([]);
  const[loading,setLoad]=useState(true);
  const[myVotes,setMyVotes]=useState({});
  const[myLikes,setMyLikes]=useState({});
  const[saved,setSaved]=useState({});
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState(BLANK);
  const[saving,setSaving]=useState(false);
  const[delIdea,setDelIdea]=useState(null);
  const[openId,setOpenId]=useState(null);
  const[comment,setComment]=useState('');
  const[comments,setComments]=useState([]);
  const[loadC,setLoadC]=useState(false);
  const[filter,setFilter]=useState('all');
  const[catF,setCatF]=useState('');
  const[search,setSearch]=useState('');
  const[sort,setSort]=useState('votes');

  const load=useCallback(async()=>{
    setLoad(true);
    let q=supabase.from('ideas').select('*');
    if(filter!=='all')q=q.eq('status',filter);
    if(catF)q=q.eq('category',catF);
    if(search)q=q.ilike('title',`%${search}%`);
    q=sort==='votes'?q.order('votes_up',{ascending:false}):q.order('created_at',{ascending:false});
    const{data}=await q;
    setIdeas(data||[]);
    if(profile){
      const[{data:votes},{data:savedRows},{data:likeRows}]=await Promise.all([
        supabase.from('idea_votes').select('idea_id,vote_type').eq('user_id',profile.id),
        supabase.from('saved_ideas').select('idea_id').eq('user_id',profile.id),
        supabase.from('idea_likes').select('idea_id').eq('user_id',profile.id),
      ]);
      const vm={};(votes||[]).forEach(v=>{vm[v.idea_id]=v.vote_type;});setMyVotes(vm);
      const sm={};(savedRows||[]).forEach(s=>{sm[s.idea_id]=true;});setSaved(sm);
      const lm={};(likeRows||[]).forEach(l=>{lm[l.idea_id]=true;});setMyLikes(lm);
    }
    setLoad(false);
  },[filter,catF,search,sort,profile]);

  useEffect(()=>{const t=setTimeout(load,300);return()=>clearTimeout(t);},[load]);

  async function loadComments(ideaId){setLoadC(true);const{data}=await supabase.from('idea_comments').select('*').eq('idea_id',ideaId).order('created_at');setComments(data||[]);setLoadC(false);}

  async function vote(idea,type){
    if(!profile)return show('Sign in to vote','error');
    const existing=myVotes[idea.id];
    if(existing===type){
      await supabase.from('idea_votes').delete().eq('idea_id',idea.id).eq('user_id',profile.id);
      const col=type==='up'?'votes_up':'votes_down';
      await supabase.from('ideas').update({[col]:Math.max(0,(idea[col]||0)-1)}).eq('id',idea.id);
      setMyVotes(v=>{const nv={...v};delete nv[idea.id];return nv;});
      setIdeas(ids=>ids.map(i=>i.id===idea.id?{...i,[col]:Math.max(0,(i[col]||0)-1)}:i));
    }else{
      if(existing){
        await supabase.from('idea_votes').update({vote_type:type}).eq('idea_id',idea.id).eq('user_id',profile.id);
        const add=type==='up'?'votes_up':'votes_down',rem=type==='up'?'votes_down':'votes_up';
        await supabase.from('ideas').update({[add]:(idea[add]||0)+1,[rem]:Math.max(0,(idea[rem]||0)-1)}).eq('id',idea.id);
        setMyVotes(v=>({...v,[idea.id]:type}));
        setIdeas(ids=>ids.map(i=>i.id===idea.id?{...i,[add]:(i[add]||0)+1,[rem]:Math.max(0,(i[rem]||0)-1)}:i));
      }else{
        await supabase.from('idea_votes').insert({idea_id:idea.id,user_id:profile.id,vote_type:type});
        const col=type==='up'?'votes_up':'votes_down';
        await supabase.from('ideas').update({[col]:(idea[col]||0)+1}).eq('id',idea.id);
        setMyVotes(v=>({...v,[idea.id]:type}));
        setIdeas(ids=>ids.map(i=>i.id===idea.id?{...i,[col]:(i[col]||0)+1}:i));
        if(type==='up'&&idea.submitted_by)await supabase.rpc('award_points',{p_user_id:idea.submitted_by,p_action:'receive_upvote'});
      }
    }
  }

  async function toggleLike(idea){
    if(!profile)return show('Sign in to like','error');
    const wasLiked=!!myLikes[idea.id];
    setMyLikes(l=>{const n={...l};if(wasLiked)delete n[idea.id];else n[idea.id]=true;return n;});
    setIdeas(ids=>ids.map(i=>i.id===idea.id?{...i,likes_count:Math.max(0,(i.likes_count||0)+(wasLiked?-1:1))}:i));
    const{error}=await supabase.rpc('toggle_idea_like',{p_idea_id:idea.id,p_user_id:profile.id});
    if(error){
      setMyLikes(l=>{const n={...l};if(wasLiked)n[idea.id]=true;else delete n[idea.id];return n;});
      setIdeas(ids=>ids.map(i=>i.id===idea.id?{...i,likes_count:Math.max(0,(i.likes_count||0)+(wasLiked?1:-1))}:i));
      return show(error.message,'error');
    }
    if(!wasLiked)show('Liked! ❤️ +2 points to author');
  }

  async function toggleSave(idea){
    if(!profile)return;
    if(saved[idea.id]){await supabase.from('saved_ideas').delete().eq('idea_id',idea.id).eq('user_id',profile.id);setSaved(s=>{const n={...s};delete n[idea.id];return n;});show('Removed from saved');}
    else{await supabase.from('saved_ideas').insert({idea_id:idea.id,user_id:profile.id});setSaved(s=>({...s,[idea.id]:true}));show('Idea saved 🔖');}
  }

  async function postComment(ideaId){
    if(!comment.trim())return;
    const{data}=await supabase.from('idea_comments').insert({idea_id:ideaId,user_id:profile?.id||null,author_name:profile?.full_name||'Anonymous',content:comment}).select().single();
    setComments(c=>[...c,data]);setComment('');
    if(profile)await supabase.rpc('award_points',{p_user_id:profile.id,p_action:'post_comment'});
  }

  async function saveIdea(){
    if(!form.title.trim()||!form.description.trim())return show('Title and description required','error');
    setSaving(true);
    try{
      if(modal==='add'){
        const{data}=await supabase.from('ideas').insert({...form,submitted_by:profile?.id||null,author_name:profile?.full_name||'Anonymous'}).select().single();
        setIdeas(i=>[data,...i]);
        if(profile)await supabase.rpc('award_points',{p_user_id:profile.id,p_action:'submit_idea'});
        await logAudit('ADD_IDEA','ideas',data.id,profile?.full_name);show('Idea submitted! 🎉 +10 pts');
      }else{
        const{data}=await supabase.from('ideas').update(form).eq('id',modal.id).select().single();
        setIdeas(i=>i.map(x=>x.id===modal.id?data:x));show('Idea updated');
      }
      setModal(null);setForm(BLANK);
    }catch(ex){show(ex.message,'error');}
    setSaving(false);
  }

  async function updateStatus(idea,status){
    const old_status=idea.status;
    const{data}=await supabase.from('ideas').update({status}).eq('id',idea.id).select().single();
    setIdeas(ids=>ids.map(i=>i.id===idea.id?data:i));
    await supabase.from('idea_status_history').insert({idea_id:idea.id,old_status,new_status:status,changed_by:profile?.full_name||'Admin'});
    if(idea.submitted_by){
      if(status==='approved')await supabase.rpc('award_points',{p_user_id:idea.submitted_by,p_action:'idea_approved'});
      if(status==='funded')await supabase.rpc('award_points',{p_user_id:idea.submitted_by,p_action:'idea_funded'});
      await supabase.from('notifications').insert({user_id:idea.submitted_by,message:`Your idea "${idea.title}" status → ${status}`,type:'idea'});
    }
    show(`Status → ${status}`);
  }

  async function doDelete(){
    await supabase.from('ideas').delete().eq('id',delIdea.id);
    setIdeas(ids=>ids.filter(i=>i.id!==delIdea.id));
    if(openId===delIdea.id)setOpenId(null);
    show('Idea deleted');setDelIdea(null);
  }

  return(
    <div>
      <Toasts/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem',gap:10,flexWrap:'wrap'}}>
        <div><h2 style={{fontSize:22,fontWeight:800,color:C.text}}>💡 Ideas Feed</h2><p style={{color:C.text3,fontSize:13,marginTop:2}}>Submit, vote and discuss innovations</p></div>
        <Btn variant="primary" icon="plus" onClick={()=>{setForm(BLANK);setModal('add');}}>Submit Idea</Btn>
      </div>
      <Card style={{marginBottom:'1rem',padding:'1rem'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:10,alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search ideas…" style={{padding:'8px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
          <select value={catF} onChange={e=>setCatF(e.target.value)} style={{padding:'8px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text2,fontSize:13,fontFamily:'inherit'}}><option value="">All Categories</option>{CATS.map(c=><option key={c}>{c}</option>)}</select>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{padding:'8px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text2,fontSize:13,fontFamily:'inherit'}}><option value="votes">Top Voted</option><option value="newest">Newest</option></select>
        </div>
        <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
          {['all','submitted','under_review','approved','funded'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:'5px 14px',borderRadius:99,border:`1px solid ${filter===f?C.primary:C.border}`,background:filter===f?C.primaryBg:'transparent',color:filter===f?C.primary2:C.text3,fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}}>{f.replace('_',' ')}</button>
          ))}
        </div>
      </Card>
      {loading&&<div style={{textAlign:'center',padding:'3rem',color:C.text3}}>Loading…</div>}
      {!loading&&ideas.length===0&&<Empty icon="bulb" message="No ideas yet — be the first!" action={<Btn variant="primary" icon="plus" onClick={()=>{setForm(BLANK);setModal('add');}}>Submit Idea</Btn>}/>}
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {ideas.map(idea=>{
          const myV=myVotes[idea.id];const isOpen=openId===idea.id;const isMine=idea.submitted_by===profile?.id;
          return(
            <div key={idea.id} style={{border:`1px solid ${isOpen?C.primary:C.border}`,borderRadius:12,background:C.surface,padding:'1.25rem',transition:'border-color 0.15s'}}>
              <div style={{display:'flex',gap:0,marginBottom:12,borderRadius:8,overflow:'hidden',border:`1px solid ${C.border}`}}>
                {LC.map((s,i)=><div key={s} style={{flex:1,padding:'4px 8px',textAlign:'center',fontSize:10,fontWeight:600,background:idea.status===s?C.primaryBg:LC.indexOf(idea.status)>i?C.successBg:'transparent',color:idea.status===s?C.primary2:LC.indexOf(idea.status)>i?C.success:C.text3,borderRight:i<3?`1px solid ${C.border}`:'none',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{LC_L[s]}</div>)}
              </div>
              <div style={{display:'flex',gap:12}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:44}}>
                  <button onClick={()=>vote(idea,'up')} style={{background:myV==='up'?C.successBg:'transparent',border:`1px solid ${myV==='up'?C.success:C.border}`,color:myV==='up'?C.success:C.text3,borderRadius:8,padding:'6px 8px',cursor:'pointer',fontSize:18,lineHeight:1,transition:'all 0.15s'}}>▲</button>
                  <span style={{fontWeight:800,fontSize:16,color:idea.votes_up>0?C.success:C.text2}}>{idea.votes_up}</span>
                  <button onClick={()=>vote(idea,'down')} style={{background:myV==='down'?C.dangerBg:'transparent',border:`1px solid ${myV==='down'?C.danger:C.border}`,color:myV==='down'?C.danger:C.text3,borderRadius:8,padding:'6px 8px',cursor:'pointer',fontSize:18,lineHeight:1,transition:'all 0.15s'}}>▼</button>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:8}}>
                    <h3 style={{fontWeight:700,fontSize:16,color:C.text,cursor:'pointer'}} onClick={()=>{const n=isOpen?null:idea.id;setOpenId(n);if(n)loadComments(n);}}>{idea.title}</h3>
                    <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap'}}><Badge label={idea.category} color={CAT_C[idea.category]||'blue'}/><Badge label={idea.status.replace('_',' ')} color={STAT_C[idea.status]||'gray'}/></div>
                  </div>
                  <p style={{fontSize:14,color:C.text2,lineHeight:1.6,marginBottom:10}}>{idea.description}</p>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}><Avatar name={idea.author_name} size={24} url={idea.avatar_url}/><span style={{fontSize:12,color:C.text3}}>{idea.author_name} · {new Date(idea.created_at).toLocaleDateString()}</span></div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <button onClick={()=>toggleLike(idea)} style={{background:myLikes[idea.id]?C.dangerBg:'transparent',border:`1px solid ${myLikes[idea.id]?C.danger:C.border}`,color:myLikes[idea.id]?C.danger:C.text3,borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',gap:5,fontFamily:'inherit',fontWeight:600,transition:'all 0.15s'}}>{myLikes[idea.id]?'❤️':'🤍'} {idea.likes_count||0}</button>
                      <button onClick={()=>toggleSave(idea)} style={{background:saved[idea.id]?C.warnBg:'transparent',border:`1px solid ${saved[idea.id]?C.warn:C.border}`,color:saved[idea.id]?C.warn:C.text3,borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:13,fontFamily:'inherit',transition:'all 0.15s'}}>🔖</button>
                      <Btn size="sm" icon="message-circle" onClick={()=>{const n=isOpen?null:idea.id;setOpenId(n);if(n)loadComments(n);}}>{isOpen?'Hide':'Comment'}</Btn>
                      {isMentor&&<select value={idea.status} onChange={e=>updateStatus(idea,e.target.value)} style={{padding:'4px 8px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:6,color:C.text2,fontSize:12,fontFamily:'inherit',cursor:'pointer'}}>{['submitted','under_review','approved','rejected','funded'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select>}
                      {(isAdmin||isMine)&&<><Btn size="sm" icon="edit" onClick={()=>{setForm({title:idea.title,description:idea.description,category:idea.category});setModal({id:idea.id});}}>Edit</Btn><Btn size="sm" danger icon="trash" onClick={()=>setDelIdea(idea)}>Del</Btn></>}
                    </div>
                  </div>
                  {isOpen&&(
                    <div style={{marginTop:14,borderTop:`1px solid ${C.border}`,paddingTop:14}}>
                      {loadC?<span style={{color:C.text3,fontSize:13}}>Loading…</span>:comments.length===0?<span style={{color:C.text3,fontSize:13}}>No comments yet.</span>:(
                        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:12}}>
                          {comments.map(cm=>(
                            <div key={cm.id} style={{display:'flex',gap:10}}>
                              <Avatar name={cm.author_name} size={28} url={cm.avatar_url}/>
                              <div style={{background:C.bg3,borderRadius:8,padding:'8px 12px',flex:1}}>
                                <div style={{fontSize:12,fontWeight:600,color:C.primary2,marginBottom:3}}>{cm.author_name}</div>
                                <div style={{fontSize:14,color:C.text2}}>{cm.content}</div>
                                <div style={{fontSize:11,color:C.text3,marginTop:3}}>{new Date(cm.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{display:'flex',gap:8}}>
                        <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add a comment…" onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&postComment(idea.id)} style={{flex:1,padding:'8px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,fontFamily:'inherit',outline:'none'}}/>
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
      {modal&&(
        <Modal title={modal==='add'?'Submit New Idea':'Edit Idea'} onClose={()=>setModal(null)} width={560}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <Inp label="Idea Title" value={form.title} onChange={v=>setForm({...form,title:v})} placeholder="Give your idea a catchy title" required/>
            <Txt label="Description" value={form.description} onChange={v=>setForm({...form,description:v})} placeholder="Describe the problem and your solution…" rows={5} required/>
            <Sel label="Category" value={form.category} onChange={v=>setForm({...form,category:v})} options={CATS}/>
          </div>
          {modal==='add'&&<div style={{marginTop:'1rem',padding:'10px 14px',background:C.primaryBg,borderRadius:8,fontSize:13,color:C.primary2}}>⭐ Submitting an idea earns you +10 points!</div>}
          <div style={{marginTop:'1rem',display:'flex',gap:10,justifyContent:'flex-end'}}>
            <Btn onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="primary" icon="send" onClick={saveIdea} disabled={saving}>{saving?'Submitting…':'Submit Idea'}</Btn>
          </div>
        </Modal>
      )}
      {delIdea&&<Confirm message={`Delete idea "${delIdea.title}"? All votes and comments will be deleted.`} onConfirm={doDelete} onCancel={()=>setDelIdea(null)}/>}
    </div>
  );
}

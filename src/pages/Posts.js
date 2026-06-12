import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Btn, Inp, Sel, Txt, Card, Modal, Confirm, Empty, useToast, C } from '../components/UI';

const CATS = ['General','Opportunity','Resource','Question','Announcement','Achievement'];
const CAT_C = { General:'gray', Opportunity:'green', Resource:'blue', Question:'amber', Announcement:'red', Achievement:'teal' };
const CAT_ICO = { General:'message-circle', Opportunity:'briefcase', Resource:'link', Question:'help-circle', Announcement:'speakerphone', Achievement:'trophy' };
const BLANK = { content:'', link_url:'', link_title:'', category:'General', media_url:'', media_type:'' };
const MAX_MEDIA_MB = 8;

export default function Posts() {
  const { profile, isAdmin } = useAuth();
  const { show, Toasts } = useToast();

  const [posts,    setPosts]   = useState([]);
  const [loading,  setLoading] = useState(true);
  const [myLikes,  setMyLikes] = useState({});
  const [modal,    setModal]   = useState(null);
  const [form,     setForm]    = useState(BLANK);
  const [saving,   setSaving]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [delPost,  setDelPost] = useState(null);
  const [openId,   setOpenId]  = useState(null);
  const [comments, setComments]= useState([]);
  const [loadC,    setLoadC]   = useState(false);
  const [comment,  setComment] = useState('');
  const [catF,     setCatF]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('posts').select('*').order('is_pinned',{ascending:false}).order('created_at',{ascending:false});
    if (catF) q = q.eq('category', catF);
    const { data } = await q;
    setPosts(data || []);
    if (profile) {
      const { data: likes } = await supabase.from('post_likes').select('post_id').eq('user_id', profile.id);
      const lm = {}; (likes||[]).forEach(l => { lm[l.post_id]=true; }); setMyLikes(lm);
    }
    setLoading(false);
  }, [catF, profile]);

  useEffect(() => { load(); }, [load]);

  async function loadComments(postId) {
    setLoadC(true);
    const { data } = await supabase.from('post_comments').select('*').eq('post_id', postId).order('created_at');
    setComments(data || []); setLoadC(false);
  }

  async function toggleLike(post) {
    if (!profile) return show('Sign in to like posts','error');
    const wasLiked = !!myLikes[post.id];
    setMyLikes(l => { const n={...l}; if (wasLiked) delete n[post.id]; else n[post.id]=true; return n; });
    setPosts(ps => ps.map(p => p.id===post.id ? {...p, likes_count:Math.max(0,(p.likes_count||0)+(wasLiked?-1:1))} : p));
    const { error } = await supabase.rpc('toggle_post_like', { p_post_id:post.id, p_user_id:profile.id });
    if (error) {
      setMyLikes(l => { const n={...l}; if (wasLiked) n[post.id]=true; else delete n[post.id]; return n; });
      setPosts(ps => ps.map(p => p.id===post.id ? {...p, likes_count:Math.max(0,(p.likes_count||0)+(wasLiked?1:-1))} : p));
      show(error.message,'error');
    }
  }

  async function postComment(postId) {
    if (!comment.trim()) return;
    const { data } = await supabase.from('post_comments').insert({ post_id:postId, user_id:profile?.id||null, author_name:profile?.full_name||'Anonymous', content:comment }).select().single();
    setComments(c => [...c, data]); setComment('');
  }

  function extractLinkTitle(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace('www.','');
    } catch { return url; }
  }

  async function uploadMedia(e) {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return show('Only image or video files are allowed','error');
    if (file.size > MAX_MEDIA_MB * 1024 * 1024) return show(`File must be under ${MAX_MEDIA_MB}MB`,'error');

    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `posts/${profile.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('post-media').upload(path, file, { upsert:true });
      if (upErr) throw upErr;
      const { data:{ publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path);
      setForm(f => ({ ...f, media_url: publicUrl, media_type: isImage ? 'image' : 'video' }));
      show(`${isImage?'Image':'Video'} attached ✅`);
    } catch (ex) {
      // Fallback for small images: store as base64 if storage bucket isn't set up
      if (isImage && file.size < 1.5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = ev => {
          setForm(f => ({ ...f, media_url: ev.target.result, media_type:'image' }));
          show('Image attached ✅');
          setUploading(false);
        };
        reader.readAsDataURL(file);
        return;
      }
      show('Upload failed — set up a "post-media" storage bucket in Supabase (see guide)','error');
    }
    setUploading(false);
  }

  function removeMedia() {
    setForm(f => ({ ...f, media_url:'', media_type:'' }));
    if (fileRef.current) fileRef.current.value = '';
  }

  async function savePost() {
    if (!form.content.trim()) return show('Write something first','error');
    if (form.link_url && !/^https?:\/\//i.test(form.link_url)) return show('Link must start with http:// or https://','error');
    setSaving(true);
    try {
      const payload = { ...form, link_title: form.link_url ? (form.link_title || extractLinkTitle(form.link_url)) : '' };
      if (modal === 'add') {
        const { data } = await supabase.from('posts').insert({ ...payload, author_id:profile?.id||null, author_name:profile?.full_name||'Anonymous' }).select().single();
        setPosts(p => [data, ...p]);
        await logAudit('ADD_POST','posts',data.id,profile?.full_name,'New post');
        show('Posted! 📢');
      } else {
        const { data } = await supabase.from('posts').update(payload).eq('id', modal.id).select().single();
        setPosts(p => p.map(x => x.id===modal.id ? data : x));
        show('Post updated');
      }
      setModal(null); setForm(BLANK);
    } catch(ex) { show(ex.message,'error'); }
    setSaving(false);
  }

  async function togglePin(post) {
    const { data } = await supabase.from('posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id).select().single();
    setPosts(p => p.map(x => x.id===post.id ? data : x).sort((a,b)=> (b.is_pinned-a.is_pinned) || (new Date(b.created_at)-new Date(a.created_at))));
    show(post.is_pinned ? 'Unpinned' : 'Pinned to top 📌');
  }

  async function doDelete() {
    await supabase.from('posts').delete().eq('id', delPost.id);
    setPosts(p => p.filter(x => x.id !== delPost.id));
    if (openId===delPost.id) setOpenId(null);
    show('Post deleted'); setDelPost(null);
  }

  return (
    <div>
      <Toasts/>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', gap:10, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>📝 Posts</h2>
          <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>Share thoughts, links, opportunities and updates with the club</p>
        </div>
        <Btn variant="primary" icon="pencil-plus" onClick={()=>{ setForm(BLANK); setModal('add'); }}>New Post</Btn>
      </div>

      {/* Category filter */}
      <div style={{ display:'flex', gap:8, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <button onClick={()=>setCatF('')} style={{ padding:'5px 14px', borderRadius:99, border:`1px solid ${!catF?C.primary:C.border}`, background:!catF?C.primaryBg:'transparent', color:!catF?C.primary2:C.text3, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>All</button>
        {CATS.map(c => (
          <button key={c} onClick={()=>setCatF(c)} style={{ padding:'5px 14px', borderRadius:99, border:`1px solid ${catF===c?C.primary:C.border}`, background:catF===c?C.primaryBg:'transparent', color:catF===c?C.primary2:C.text3, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', display:'flex', alignItems:'center', gap:5 }}>
            <i className={`ti ti-${CAT_ICO[c]}`} style={{ fontSize:13 }}/>{c}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:'3rem', color:C.text3 }}>Loading posts…</div>}
      {!loading && posts.length===0 && <Empty icon="message-2" message="No posts yet — be the first to share something!" action={<Btn variant="primary" icon="pencil-plus" onClick={()=>{ setForm(BLANK); setModal('add'); }}>New Post</Btn>}/>}

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {posts.map(post => {
          const isOpen = openId === post.id;
          const isMine = post.author_id === profile?.id;
          return (
            <Card key={post.id} style={{ border: post.is_pinned ? `1px solid ${C.warn}` : `1px solid ${isOpen?C.primary:C.border}` }}>
              {post.is_pinned && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, color:C.warn, fontSize:12, fontWeight:600 }}>
                  <i className="ti ti-pin" style={{ fontSize:14 }}/>Pinned Post
                </div>
              )}
              <div style={{ display:'flex', gap:12 }}>
                <Avatar name={post.author_name} size={40} url={post.avatar_url}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{post.author_name}</div>
                      <div style={{ fontSize:11, color:C.text3 }}>{new Date(post.created_at).toLocaleString()}</div>
                    </div>
                    <Badge label={post.category} color={CAT_C[post.category]||'gray'}/>
                  </div>

                  <p style={{ fontSize:14, color:C.text2, lineHeight:1.6, marginBottom:(post.link_url||post.media_url)?10:12, whiteSpace:'pre-wrap' }}>{post.content}</p>

                  {post.media_url && (
                    <div style={{ borderRadius:10, overflow:'hidden', marginBottom:12, border:`1px solid ${C.border}`, background:'#000' }}>
                      {post.media_type==='video'
                        ? <video src={post.media_url} controls style={{ width:'100%', maxHeight:420, display:'block' }}/>
                        : <img src={post.media_url} alt="" style={{ width:'100%', maxHeight:420, objectFit:'contain', display:'block', margin:'0 auto' }}/>}
                    </div>
                  )}

                  {post.link_url && (
                    <a href={post.link_url} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:C.bg3, borderRadius:8, marginBottom:12, textDecoration:'none', border:`1px solid ${C.border}` }}>
                      <i className="ti ti-link" style={{ color:C.primary2, fontSize:18, flexShrink:0 }}/>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:C.primary2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{post.link_title || post.link_url}</div>
                        <div style={{ fontSize:11, color:C.text3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{post.link_url}</div>
                      </div>
                    </a>
                  )}

                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <button onClick={()=>toggleLike(post)} style={{ background:myLikes[post.id]?C.dangerBg:'transparent', border:`1px solid ${myLikes[post.id]?C.danger:C.border}`, color:myLikes[post.id]?C.danger:C.text3, borderRadius:8, padding:'4px 10px', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:5, fontFamily:'inherit', fontWeight:600, transition:'all 0.15s' }}>
                      {myLikes[post.id]?'❤️':'🤍'} {post.likes_count||0}
                    </button>
                    <Btn size="sm" icon="message-circle" onClick={()=>{ const n = isOpen?null:post.id; setOpenId(n); if(n) loadComments(n); }}>
                      {isOpen?'Hide':'Comment'}
                    </Btn>
                    {isAdmin && <Btn size="sm" icon="pin" onClick={()=>togglePin(post)}>{post.is_pinned?'Unpin':'Pin'}</Btn>}
                    {(isAdmin||isMine) && <>
                      <Btn size="sm" icon="edit" onClick={()=>{ setForm({content:post.content, link_url:post.link_url||'', link_title:post.link_title||'', category:post.category, media_url:post.media_url||'', media_type:post.media_type||''}); setModal({id:post.id}); }}>Edit</Btn>
                      <Btn size="sm" danger icon="trash" onClick={()=>setDelPost(post)}>Del</Btn>
                    </>}
                  </div>

                  {/* Comments */}
                  {isOpen && (
                    <div style={{ marginTop:14, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
                      {loadC ? <span style={{ color:C.text3, fontSize:13 }}>Loading comments…</span> :
                        comments.length===0 ? <span style={{ color:C.text3, fontSize:13 }}>No comments yet.</span> :
                        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
                          {comments.map(cm => (
                            <div key={cm.id} style={{ display:'flex', gap:10 }}>
                              <Avatar name={cm.author_name} size={28} url={cm.avatar_url}/>
                              <div style={{ background:C.bg3, borderRadius:8, padding:'8px 12px', flex:1 }}>
                                <div style={{ fontSize:12, fontWeight:600, color:C.primary2, marginBottom:3 }}>{cm.author_name}</div>
                                <div style={{ fontSize:14, color:C.text2 }}>{cm.content}</div>
                                <div style={{ fontSize:11, color:C.text3, marginTop:3 }}>{new Date(cm.created_at).toLocaleString()}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      }
                      <div style={{ display:'flex', gap:8 }}>
                        <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add a comment…" onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&postComment(post.id)}
                          style={{ flex:1, padding:'8px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit', outline:'none' }}/>
                        <Btn size="sm" variant="primary" icon="send" onClick={()=>postComment(post.id)}>Post</Btn>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal==='add'?'New Post':'Edit Post'} onClose={()=>{ setModal(null); setForm(BLANK); }} width={560}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Txt label="What's on your mind?" value={form.content} onChange={v=>setForm({...form,content:v})} placeholder="Share an update, ask a question, post an opportunity…" rows={4} required/>

            {/* Media upload */}
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>Photo or Video (optional)</label>
              {form.media_url ? (
                <div style={{ position:'relative', borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}` }}>
                  {form.media_type==='video'
                    ? <video src={form.media_url} controls style={{ width:'100%', maxHeight:240, display:'block', background:'#000' }}/>
                    : <img src={form.media_url} alt="attachment" style={{ width:'100%', maxHeight:240, objectFit:'cover', display:'block' }}/>}
                  <button onClick={removeMedia} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', borderRadius:99, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className="ti ti-x" style={{ fontSize:16 }}/>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={()=>fileRef.current?.click()} disabled={uploading}
                  style={{ width:'100%', padding:'18px', border:`1px dashed ${C.border2}`, borderRadius:8, background:C.bg3, color:C.text3, cursor:uploading?'wait':'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, fontFamily:'inherit', fontSize:13 }}>
                  {uploading
                    ? <><i className="ti ti-loader-2 spin" style={{ fontSize:22 }}/> Uploading…</>
                    : <><i className="ti ti-photo-video" style={{ fontSize:22 }}/> Click to add a photo or video (max {MAX_MEDIA_MB}MB)</>}
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*,video/*" onChange={uploadMedia} style={{ display:'none' }}/>
            </div>

            <Inp label="Link (optional)" value={form.link_url} onChange={v=>setForm({...form,link_url:v})} placeholder="https://…"/>
            {form.link_url && <Inp label="Link Title (optional)" value={form.link_title} onChange={v=>setForm({...form,link_title:v})} placeholder="Short description of the link"/>}
            <Sel label="Category" value={form.category} onChange={v=>setForm({...form,category:v})} options={CATS}/>
          </div>
          <div style={{ marginTop:'1.25rem', display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn onClick={()=>{ setModal(null); setForm(BLANK); }}>Cancel</Btn>
            <Btn variant="primary" icon="send" onClick={savePost} disabled={saving||uploading}>{saving?'Posting…':'Post'}</Btn>
          </div>
        </Modal>
      )}
      {delPost && <Confirm message="Delete this post? All comments and likes will also be deleted." onConfirm={doDelete} onCancel={()=>setDelPost(null)}/>}
    </div>
  );
}

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Btn, Empty, useToast, C } from '../components/UI';

export default function Messages() {
  const { profile } = useAuth();
  const { show, Toasts } = useToast();
  const [contacts,   setContacts]   = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [search,     setSearch]     = useState('');
  const [active,     setActive]     = useState(null); // selected contact profile
  const [thread,     setThread]     = useState([]);
  const [loadingC,   setLoadingC]   = useState(true);
  const [loadingT,   setLoadingT]   = useState(false);
  const [text,       setText]       = useState('');
  const [unreadMap,  setUnreadMap]  = useState({});
  const [mobileView, setMobileView] = useState('list'); // list | thread (for small screens)
  const bottomRef = useRef(null);

  /* ── Load all members (excluding self) as potential contacts ── */
  const loadContacts = useCallback(async () => {
    setLoadingC(true);
    const { data } = await supabase.from('profiles')
      .select('id,full_name,email,section,role,avatar_url,is_active')
      .neq('id', profile.id)
      .eq('is_active', true)
      .order('full_name');
    setContacts(data || []);
    setFiltered(data || []);

    // unread counts grouped by sender
    const { data: unread } = await supabase.from('messages')
      .select('sender_id')
      .eq('receiver_id', profile.id)
      .eq('is_read', false);
    const um = {};
    (unread || []).forEach(m => { um[m.sender_id] = (um[m.sender_id] || 0) + 1; });
    setUnreadMap(um);
    setLoadingC(false);
  }, [profile.id]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  /* ── If navigated here from Members page with a target contact ── */
  useEffect(() => {
    const targetId = sessionStorage.getItem('letvc_chat_with');
    if (targetId && contacts.length > 0) {
      const target = contacts.find(c => c.id === targetId);
      if (target) {
        openContact(target);
      }
      sessionStorage.removeItem('letvc_chat_with');
    }
  }, [contacts]);

  /* ── Search filter ── */
  useEffect(() => {
    if (!search.trim()) { setFiltered(contacts); return; }
    const s = search.toLowerCase();
    setFiltered(contacts.filter(c => c.full_name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.section?.toLowerCase().includes(s)));
  }, [search, contacts]);

  /* ── Load thread with active contact ── */
  const loadThread = useCallback(async (contact) => {
    setLoadingT(true);
    const { data } = await supabase.from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${profile.id})`)
      .order('created_at');
    setThread(data || []);
    setLoadingT(false);

    // mark unread as read
    await supabase.from('messages').update({ is_read:true }).eq('sender_id',contact.id).eq('receiver_id',profile.id).eq('is_read',false);
    setUnreadMap(u => { const n = {...u}; delete n[contact.id]; return n; });
  }, [profile.id]);

  function openContact(c) {
    setActive(c);
    setMobileView('thread');
    loadThread(c);
  }

  /* ── Realtime subscription for new messages ── */
  useEffect(() => {
    const ch = supabase.channel('messages_'+profile.id)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`receiver_id=eq.${profile.id}` }, payload => {
        const msg = payload.new;
        if (active && msg.sender_id === active.id) {
          setThread(t => [...t, msg]);
          supabase.from('messages').update({ is_read:true }).eq('id', msg.id);
        } else {
          setUnreadMap(u => ({ ...u, [msg.sender_id]: (u[msg.sender_id]||0)+1 }));
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile.id, active]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [thread]);

  async function send() {
    if (!text.trim() || !active) return;
    const content = text.trim();
    setText('');
    const { data, error } = await supabase.from('messages').insert({ sender_id:profile.id, receiver_id:active.id, content }).select().single();
    if (error) return show(error.message,'error');
    setThread(t => [...t, data]);
  }

  const totalUnread = Object.values(unreadMap).reduce((a,b)=>a+b,0);

  return (
    <div style={{ height:'calc(100vh - 120px)', display:'flex', flexDirection:'column' }}>
      <Toasts/>
      <div style={{ marginBottom:'1rem' }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>💬 Messages</h2>
        <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>
          Private conversations with club members{totalUnread>0 && <span style={{ color:C.primary2 }}> · {totalUnread} unread</span>}
        </p>
      </div>

      <div style={{ flex:1, display:'flex', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', background:C.surface, minHeight:0 }}>
        {/* Contacts list */}
        <div className="msg-contacts" style={{ width:300, minWidth:300, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'12px', borderBottom:`1px solid ${C.border}` }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search members…"
              style={{ width:'100%', padding:'8px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {loadingC && <div style={{ padding:'2rem', textAlign:'center', color:C.text3, fontSize:13 }}>Loading…</div>}
            {!loadingC && filtered.length===0 && <div style={{ padding:'2rem', textAlign:'center', color:C.text3, fontSize:13 }}>No members found</div>}
            {filtered.map(c => (
              <div key={c.id} onClick={()=>openContact(c)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', background:active?.id===c.id?C.primaryBg:'transparent', borderBottom:`1px solid ${C.border}`, transition:'background 0.15s' }}>
                <Avatar name={c.full_name||c.email} size={36} section={c.section} url={c.avatar_url}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.full_name||c.email}</div>
                  <div style={{ fontSize:11, color:C.text3 }}>{c.section||c.role}</div>
                </div>
                {unreadMap[c.id] > 0 && (
                  <span style={{ background:C.danger, color:'#fff', borderRadius:99, fontSize:10, fontWeight:700, minWidth:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{unreadMap[c.id]}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className="msg-thread" style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          {!active ? (
            <div style={{ flex:1 }}><Empty icon="messages" message="Select a member to start chatting"/></div>
          ) : (
            <>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
                <button className="back-btn" onClick={()=>setMobileView('list')} style={{ display:'none', background:'none', border:'none', color:C.text2, cursor:'pointer', padding:4 }}>
                  <i className="ti ti-arrow-left" style={{ fontSize:20 }}/>
                </button>
                <Avatar name={active.full_name||active.email} size={34} section={active.section} url={active.avatar_url}/>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:C.text }}>{active.full_name||active.email}</div>
                  <div style={{ fontSize:11, color:C.text3 }}>{active.section}{active.role && <Badge label={active.role} color={active.role==='admin'?'red':active.role==='mentor'?'teal':'blue'} />}</div>
                </div>
              </div>

              <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:8 }}>
                {loadingT && <div style={{ textAlign:'center', color:C.text3, fontSize:13 }}>Loading conversation…</div>}
                {!loadingT && thread.length===0 && <div style={{ textAlign:'center', color:C.text3, fontSize:13, marginTop:'2rem' }}>No messages yet. Say hello! 👋</div>}
                {thread.map(m => {
                  const mine = m.sender_id === profile.id;
                  return (
                    <div key={m.id} style={{ display:'flex', justifyContent:mine?'flex-end':'flex-start' }}>
                      <div style={{ maxWidth:'70%', background:mine?C.primary:C.bg3, color:mine?'#fff':C.text, borderRadius:12, padding:'8px 14px', fontSize:14, lineHeight:1.5 }}>
                        {m.content}
                        <div style={{ fontSize:10, opacity:0.7, marginTop:4, textAlign:'right' }}>{new Date(m.created_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef}/>
              </div>

              <div style={{ padding:'12px 16px', borderTop:`1px solid ${C.border}`, display:'flex', gap:8 }}>
                <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message…" onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
                  style={{ flex:1, padding:'10px 14px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:'inherit', outline:'none' }}/>
                <Btn variant="primary" icon="send" onClick={send} disabled={!text.trim()}>Send</Btn>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media(max-width:767px){
          .msg-contacts{ display:${active?'none':'flex'}!important; width:100%!important; min-width:0!important; }
          .msg-thread{ display:${active?'flex':'none'}!important; }
          .back-btn{ display:block!important; }
        }
      `}</style>
    </div>
  );
}

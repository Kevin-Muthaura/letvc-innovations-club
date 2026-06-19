import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Avatar, NotificationBell, C } from './UI';

const NAV = [
  { id:'dashboard',     label:'Dashboard',     icon:'layout-dashboard' },
  { id:'posts',         label:'Posts',         icon:'message-2' },
  { id:'members',       label:'Members',       icon:'users' },
  { id:'ideas',         label:'Ideas Feed',    icon:'bulb' },
  { id:'projects',      label:'Projects',      icon:'rocket' },
  { id:'events',        label:'Events',        icon:'calendar-event' },
  { id:'meetings',      label:'Meetings',      icon:'users-group' },
  { id:'mentors',       label:'Mentors',       icon:'user-star' },
  { id:'announcements', label:'Announcements', icon:'speakerphone' },
  { id:'leaderboard',   label:'Leaderboard',   icon:'trophy' },
  { id:'messages',      label:'Messages',      icon:'message-circle' },
];

const WHATSAPP = 'https://chat.whatsapp.com/DWvtX7uxDcOCWDInbNDOUM';

export default function Layout({ page, setPage, children }) {
  const { profile, isAdmin, signOut } = useAuth();
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [unreadMsgs,  setUnreadMsgs]  = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    async function loadUnread() {
      const { count } = await supabase.from('messages').select('id',{count:'exact',head:true}).eq('receiver_id',profile.id).eq('is_read',false);
      setUnreadMsgs(count||0);
    }
    loadUnread();
    const ch = supabase.channel('unread_'+profile.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`receiver_id=eq.${profile.id}`},()=>setUnreadMsgs(n=>n+1))
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:`receiver_id=eq.${profile.id}`},()=>loadUnread())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [profile?.id]);

  useEffect(() => { if (page === 'messages') setTimeout(()=>setUnreadMsgs(0), 1000); }, [page]);

  function NavItem({ item, badge }) {
    const active = page === item.id;
    return (
      <button onClick={() => { setPage(item.id); setMobileOpen(false); }}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:500, fontSize:14, background:active?C.primaryBg:'transparent', color:active?C.primary2:C.text2, transition:'all 0.15s', textAlign:'left', whiteSpace:'nowrap', overflow:'hidden', position:'relative' }}
        title={collapsed ? item.label : undefined}>
        <i className={`ti ti-${item.icon}`} style={{ fontSize:18, flexShrink:0 }}/>
        {!collapsed && <span style={{ flex:1 }}>{item.label}</span>}
        {!collapsed && badge > 0 && <span style={{ background:C.danger, color:'#fff', borderRadius:99, fontSize:10, fontWeight:700, minWidth:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px' }}>{badge}</span>}
        {collapsed  && badge > 0 && <span style={{ position:'absolute', top:4, right:4, width:8, height:8, borderRadius:'50%', background:C.danger }}/>}
      </button>
    );
  }

  const Sidebar = ({ mobile }) => (
    <div style={{ width:mobile?220:collapsed?56:220, minWidth:mobile?220:collapsed?56:220, background:C.bg2, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', transition:mobile?undefined:'width 0.2s,min-width 0.2s', overflow:'hidden', height:'100vh', position:mobile?'fixed':'sticky', top:0, zIndex:mobile?200:undefined, left:mobile?(mobileOpen?0:-240):undefined }}>
      <div style={{ padding:'16px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10, overflow:'hidden' }}>
        <div style={{ width:34, height:34, minWidth:34, borderRadius:10, background:C.primaryBg, border:`1px solid ${C.primary}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-bulb" style={{ fontSize:18, color:C.primary2 }}/>
        </div>
        {(!collapsed||mobile) && <div style={{ overflow:'hidden' }}>
          <div style={{ fontWeight:700, fontSize:13, color:C.text, whiteSpace:'nowrap' }}>LETVC Innovations</div>
          <div style={{ fontSize:11, color:C.text3, whiteSpace:'nowrap' }}>Club Portal</div>
        </div>}
      </div>

      <nav style={{ flex:1, padding:'8px', overflowY:'auto' }}>
        {NAV.map(item => <NavItem key={item.id} item={item} badge={item.id==='messages'?unreadMsgs:0}/>)}
        {isAdmin && <NavItem item={{ id:'admin', label:'Admin Panel', icon:'settings' }} badge={0}/>}
        {(!collapsed||mobile) && (
          <a href={WHATSAPP} target="_blank" rel="noreferrer"
            style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:8, color:'#25D366', fontSize:14, fontWeight:500, textDecoration:'none', marginTop:8, background:'rgba(37,211,102,0.1)' }}>
            <i className="ti ti-brand-whatsapp" style={{ fontSize:18, flexShrink:0 }}/>
            <span>WhatsApp Group</span>
          </a>
        )}
      </nav>

      <div style={{ padding:'10px 8px', borderTop:`1px solid ${C.border}` }}>
        <button onClick={() => { setPage('profile'); setMobileOpen(false); }}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', background:page==='profile'?C.primaryBg:'transparent', transition:'all 0.15s', overflow:'hidden' }}>
          <Avatar name={profile?.full_name||profile?.email||'?'} size={28} section={profile?.section} url={profile?.avatar_url}/>
          {(!collapsed||mobile) && <div style={{ flex:1, textAlign:'left', overflow:'hidden' }}>
            <div style={{ fontSize:12, fontWeight:600, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile?.full_name||'My Profile'}</div>
            <div style={{ fontSize:11, color:C.text3 }}>{profile?.role}</div>
          </div>}
        </button>
        <button onClick={signOut} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer', background:'transparent', color:C.danger, fontFamily:'inherit', fontSize:13, fontWeight:500, marginTop:4 }}>
          <i className="ti ti-logout" style={{ fontSize:18, flexShrink:0 }}/>
          {(!collapsed||mobile) && 'Sign Out'}
        </button>
        {!mobile && (
          <button onClick={() => setCollapsed(c=>!c)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:collapsed?'center':'flex-end', padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', background:'transparent', color:C.text3 }}>
            <i className={`ti ti-${collapsed?'chevrons-right':'chevrons-left'}`} style={{ fontSize:16 }}/>
          </button>
        )}
      </div>
    </div>
  );

  const pageLabel = [...NAV,{id:'admin',label:'Admin Panel'},{id:'profile',label:'My Profile'}].find(n=>n.id===page)?.label || 'LETVC Innovations Club';

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:C.bg, fontFamily:"'Inter',system-ui,sans-serif", fontSize:14 }}>
      <div className="desktop-sidebar"><Sidebar/></div>
      {mobileOpen && <div onClick={()=>setMobileOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:190 }}/>}
      <div className="mobile-sidebar"><Sidebar mobile/></div>

      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:'100vh' }}>
        <header style={{ background:C.bg2, borderBottom:`1px solid ${C.border}`, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, position:'sticky', top:0, zIndex:100 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>setMobileOpen(m=>!m)} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3, padding:4 }}>
              <i className="ti ti-menu-2" style={{ fontSize:22 }}/>
            </button>
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:C.text }}>{pageLabel}</div>
              <div style={{ fontSize:11, color:C.text3 }}>Laikipia East Technical & Vocational College</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <NotificationBell userId={profile?.id}/>
            <Avatar name={profile?.full_name||'?'} size={30} section={profile?.section} url={profile?.avatar_url}/>
          </div>
        </header>

        <main style={{ flex:1, padding:'1.5rem', overflowY:'auto', maxWidth:1200, width:'100%', margin:'0 auto', boxSizing:'border-box' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media(min-width:768px){.mobile-sidebar{display:none!important}.desktop-sidebar{display:block!important}}
        @media(max-width:767px){.desktop-sidebar{display:none!important}}
        *{box-sizing:border-box}
      `}</style>
    </div>
  );
}

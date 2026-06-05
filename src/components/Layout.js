import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, C } from './UI';

const NAV = [
  { id:'dashboard',      label:'Dashboard',      icon:'layout-dashboard' },
  { id:'members',        label:'Members',         icon:'users' },
  { id:'ideas',          label:'Ideas',           icon:'bulb' },
  { id:'projects',       label:'Projects',        icon:'rocket' },
  { id:'events',         label:'Events',          icon:'calendar-event' },
  { id:'mentors',        label:'Mentors',         icon:'user-star' },
  { id:'announcements',  label:'Announcements',   icon:'speakerphone' },
  { id:'leaderboard',    label:'Leaderboard',     icon:'trophy' },
];

export default function Layout({ page, setPage, children }) {
  const { profile, isAdmin, signOut } = useAuth();
  const [collapsed, setCollapsed]     = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);

  const sidebarW = collapsed ? 56 : 220;

  function NavItem({ item }) {
    const active = page === item.id;
    return (
      <button onClick={() => { setPage(item.id); setMobileOpen(false); }}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:500, fontSize:14, background:active?C.primaryBg:'transparent', color:active?C.primary2:C.text2, transition:'all 0.15s', textAlign:'left', whiteSpace:'nowrap', overflow:'hidden' }}
        title={collapsed ? item.label : undefined}>
        <i className={`ti ti-${item.icon}`} style={{ fontSize:18, flexShrink:0 }} />
        {!collapsed && <span>{item.label}</span>}
      </button>
    );
  }

  const Sidebar = ({ mobile }) => (
    <div style={{ width: mobile ? 220 : sidebarW, minWidth: mobile ? 220 : sidebarW, background:C.bg2, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', transition: mobile ? undefined : 'width 0.2s, min-width 0.2s', overflow:'hidden', height:'100vh', position: mobile ? 'fixed' : 'sticky', top:0, zIndex: mobile ? 200 : undefined, left: mobile ? (mobileOpen ? 0 : -240) : undefined }}>
      {/* Logo */}
      <div style={{ padding:'16px 14px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10, overflow:'hidden' }}>
        <div style={{ width:34, height:34, minWidth:34, borderRadius:10, background:C.primaryBg, border:`1px solid ${C.primary}40`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-bulb" style={{ fontSize:18, color:C.primary2 }} />
        </div>
        {(!collapsed || mobile) && (
          <div style={{ overflow:'hidden' }}>
            <div style={{ fontWeight:700, fontSize:13, color:C.text, whiteSpace:'nowrap' }}>LETVC Innovations</div>
            <div style={{ fontSize:11, color:C.text3, whiteSpace:'nowrap' }}>Club Portal</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'8px 8px', overflowY:'auto' }}>
        {NAV.map(item => <NavItem key={item.id} item={item} />)}
        {isAdmin && (
          <NavItem item={{ id:'admin', label:'Admin Panel', icon:'settings' }} />
        )}
      </nav>

      {/* Profile + Signout */}
      <div style={{ padding:'10px 8px', borderTop:`1px solid ${C.border}` }}>
        <button onClick={() => { setPage('profile'); setMobileOpen(false); }}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', background:page==='profile'?C.primaryBg:'transparent', transition:'all 0.15s', overflow:'hidden' }}>
          <Avatar name={profile?.full_name || profile?.email || '?'} size={28} section={profile?.section} />
          {(!collapsed || mobile) && (
            <div style={{ flex:1, textAlign:'left', overflow:'hidden' }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{profile?.full_name || 'My Profile'}</div>
              <div style={{ fontSize:11, color:C.text3 }}>{profile?.role}</div>
            </div>
          )}
        </button>
        <button onClick={signOut} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer', background:'transparent', color:C.danger, fontFamily:'inherit', fontSize:13, fontWeight:500, marginTop:4, transition:'all 0.15s' }}>
          <i className="ti ti-logout" style={{ fontSize:18, flexShrink:0 }} />
          {(!collapsed || mobile) && 'Sign Out'}
        </button>
        {!mobile && (
          <button onClick={() => setCollapsed(c => !c)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:collapsed?'center':'flex-end', padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', background:'transparent', color:C.text3, transition:'all 0.15s' }}>
            <i className={`ti ti-${collapsed?'chevrons-right':'chevrons-left'}`} style={{ fontSize:16 }} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:C.bg, fontFamily:"'Inter',system-ui,sans-serif", fontSize:14 }}>
      {/* Desktop sidebar */}
      <div style={{ display:'none', '@media(min-width:768px)':{ display:'block' } }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:190 }} />}
      <div style={{ display:'block' }} className="mobile-sidebar"><Sidebar mobile /></div>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:'100vh' }}>
        {/* Top bar */}
        <header style={{ background:C.bg2, borderBottom:`1px solid ${C.border}`, padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, position:'sticky', top:0, zIndex:100 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setMobileOpen(m => !m)} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3, padding:4, display:'block' }}>
              <i className="ti ti-menu-2" style={{ fontSize:22 }} />
            </button>
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:C.text }}>
                {NAV.find(n => n.id === page)?.label || (page === 'admin' ? 'Admin Panel' : page === 'profile' ? 'My Profile' : 'LETVC Innovations Club')}
              </div>
              <div style={{ fontSize:11, color:C.text3 }}>Laikipia East Technical & Vocational College</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, color:C.text3, display:'none' }} className="show-sm">2025/2026</span>
            <Avatar name={profile?.full_name || '?'} size={30} section={profile?.section} />
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex:1, padding:'1.5rem', overflowY:'auto', maxWidth:1200, width:'100%', margin:'0 auto', boxSizing:'border-box' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media(min-width:768px){ .mobile-sidebar{ display:none!important } .desktop-sidebar{ display:block!important } }
        @media(max-width:767px){ .desktop-sidebar{ display:none!important } .show-sm{ display:block!important } }
        *{ box-sizing:border-box; }
      `}</style>
    </div>
  );
}

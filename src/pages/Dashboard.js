import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card, Badge, ProgressBar, Avatar, C } from '../components/UI';

const STAGE_C = { Ideation:'blue', Research:'purple', Prototype:'amber', Testing:'teal', 'Exhibition Ready':'green', Completed:'gray' };
const EVT_C   = { hackathon:'red', workshop:'blue', pitch_night:'green', meeting:'purple', excursion:'teal', competition:'amber' };
const PRI_C   = { high:'red', medium:'amber', low:'blue' };

export default function Dashboard() {
  const { profile } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      const [mRes, pRes, eRes, aRes, projRes, patronRes] = await Promise.all([
        supabase.from('members').select('section, status').eq('status','active'),
        supabase.from('projects').select('id,title,stage,progress,department,status').eq('status','active').order('updated_at',{ascending:false}).limit(4),
        supabase.from('events').select('*').gte('event_date', new Date().toISOString().slice(0,10)).order('event_date').limit(3),
        supabase.from('announcements').select('*').order('post_date',{ascending:false}).limit(3),
        supabase.from('projects').select('id',{count:'exact',head:true}).eq('status','active'),
        supabase.from('patron').select('*').single(),
      ]);
      const members = mRes.data || [];
      const sectionMap = {};
      members.forEach(m => { sectionMap[m.section] = (sectionMap[m.section]||0)+1; });
      const sections = Object.entries(sectionMap).sort((a,b)=>b[1]-a[1]).map(([s,c])=>({s,c}));
      setData({ members, sections, projects: pRes.data||[], events: eRes.data||[], announcements: aRes.data||[], projectCount: projRes.count||0, patron: patronRes.data });
    }
    load();
  }, []);

  if (!data) return <Loader />;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
      <div>
        <h2 style={{ fontSize:24, fontWeight:800, color:C.text }}>
          Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
        </h2>
        <p style={{ color:C.text3, fontSize:13, marginTop:4 }}>LETVC Innovations Club · Academic Year 2025/2026</p>
      </div>

      {/* High priority announcements */}
      {data.announcements.filter(a=>a.priority==='high').map(a => (
        <div key={a.id} style={{ background:C.primaryBg, border:`1px solid ${C.primary}40`, borderRadius:10, padding:'12px 16px', display:'flex', gap:10 }}>
          <i className="ti ti-speakerphone" style={{ color:C.primary2, fontSize:20, flexShrink:0 }}/>
          <div>
            <strong style={{ color:C.primary2, fontSize:14 }}>{a.title}</strong>
            <p style={{ fontSize:13, color:C.text2, marginTop:3 }}>{a.body}</p>
          </div>
        </div>
      ))}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
        <StatCard icon="users"          label="Active Members"   value={data.members.length} color={C.primary} />
        <StatCard icon="bulb"           label="Active Projects"  value={data.projectCount}   color={C.accent} />
        <StatCard icon="calendar-event" label="Upcoming Events"  value={data.events.length}  color={C.warn} />
        <StatCard icon="layout-grid"    label="Departments"      value={data.sections.length} color="#a78bfa" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Members by dept */}
        <Card>
          <h3 style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>Members by Department</h3>
          {data.sections.map(({s,c}) => (
            <div key={s} style={{ marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                <span style={{ color:C.text2 }}>{s}</span>
                <span style={{ fontWeight:700, color:C.text }}>{c}</span>
              </div>
              <ProgressBar value={Math.round(c/data.members.length*100)} />
            </div>
          ))}
        </Card>

        {/* Upcoming events */}
        <Card>
          <h3 style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>Upcoming Events</h3>
          {data.events.length===0 && <p style={{ color:C.text3, fontSize:13 }}>No upcoming events scheduled.</p>}
          {data.events.map(e => (
            <div key={e.id} style={{ marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <span style={{ fontWeight:600, fontSize:13, color:C.text }}>{e.title}</span>
                <Badge label={e.event_type.replace('_',' ')} color={EVT_C[e.event_type]||'blue'} />
              </div>
              <div style={{ fontSize:12, color:C.text3, marginTop:4, display:'flex', gap:12 }}>
                <span><i className="ti ti-calendar" style={{ marginRight:4 }}/>{e.event_date}</span>
                {e.venue && <span><i className="ti ti-map-pin" style={{ marginRight:4 }}/>{e.venue}</span>}
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Projects */}
      <Card>
        <h3 style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:14 }}>Active Innovation Projects</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
          {data.projects.map(p => (
            <div key={p.id} style={{ border:`1px solid ${C.border}`, borderRadius:10, padding:'1rem', background:C.bg3 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                <span style={{ fontWeight:600, fontSize:14, color:C.text }}>{p.title}</span>
                <Badge label={p.stage} color={STAGE_C[p.stage]||'blue'} />
              </div>
              <div style={{ fontSize:12, color:C.text3, marginBottom:8 }}>{p.department}</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                <span style={{ color:C.text3 }}>Progress</span>
                <span style={{ fontWeight:700, color:C.text }}>{p.progress}%</span>
              </div>
              <ProgressBar value={p.progress} />
            </div>
          ))}
        </div>
      </Card>

      {/* Patron */}
      {data.patron && (
        <Card>
          <h3 style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:12 }}>Club Patron</h3>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <Avatar name={data.patron.full_name} size={56} color={C.accent} />
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:C.text }}>{data.patron.full_name}</div>
              <div style={{ fontSize:13, color:C.text3 }}>Patron, LETVC Innovations Club</div>
              <div style={{ fontSize:13, color:C.text2, marginTop:6, display:'flex', gap:16, flexWrap:'wrap' }}>
                {data.patron.phone && <span><i className="ti ti-phone" style={{ marginRight:4 }}/>{data.patron.phone}</span>}
                {data.patron.email && <span><i className="ti ti-mail" style={{ marginRight:4 }}/>{data.patron.email}</span>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recent announcements */}
      <Card>
        <h3 style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:12 }}>Latest Announcements</h3>
        {data.announcements.map(a => (
          <div key={a.id} style={{ padding:'12px 0', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{a.title}</div>
              <div style={{ fontSize:13, color:C.text2, marginTop:3 }}>{a.body}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
              <Badge label={a.priority} color={PRI_C[a.priority]} />
              <span style={{ fontSize:11, color:C.text3 }}>{a.post_date}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Loader() {
  return <div style={{ display:'flex', justifyContent:'center', padding:'4rem', color:C.text3 }}><i className="ti ti-loader-2 spin" style={{ fontSize:36 }}/></div>;
}

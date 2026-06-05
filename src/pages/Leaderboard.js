import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Avatar, Badge, Card, C } from '../components/UI';

const BADGES_DEF = [
  { id:'innovator',   label:'💡 Innovator',    desc:'Submitted first idea',       color:'amber' },
  { id:'top_voter',   label:'🗳️ Top Voter',    desc:'Cast 10+ votes',             color:'blue' },
  { id:'builder',     label:'🔨 Builder',       desc:'Part of a project team',     color:'teal' },
  { id:'mentor_pick', label:'⭐ Mentor Pick',   desc:'Idea approved by mentor',    color:'purple' },
  { id:'pioneer',     label:'🚀 Pioneer',       desc:'First member of the club',   color:'red' },
];

export default function Leaderboard() {
  const [profiles, setProfiles] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('points');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('id,full_name,section,points,badges,role').eq('is_active',true).order('points',{ascending:false});
      setProfiles(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const sorted = tab === 'points'
    ? [...profiles].sort((a,b) => (b.points||0) - (a.points||0))
    : [...profiles].sort((a,b) => (b.badges?.length||0) - (a.badges?.length||0));

  const RANK_COLORS = ['#FFD700','#C0C0C0','#CD7F32'];
  const RANK_ICO    = ['🥇','🥈','🥉'];

  return (
    <div>
      <div style={{ marginBottom:'1.25rem' }}>
        <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>🏆 Leaderboard</h2>
        <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>Top innovators ranked by contribution points</p>
      </div>

      {/* Top 3 podium */}
      {!loading && sorted.length >= 3 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr', gap:12, marginBottom:'1.5rem', alignItems:'flex-end' }}>
          {[sorted[1], sorted[0], sorted[2]].map((p, i) => {
            const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
            const height = rank === 1 ? 160 : rank === 2 ? 130 : 110;
            return (
              <Card key={p?.id} style={{ textAlign:'center', padding:'1.25rem 1rem', background: rank===1 ? `linear-gradient(135deg,#1a1440,${C.surface})` : C.surface }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{RANK_ICO[rank-1]}</div>
                <Avatar name={p?.full_name||'?'} size={52} section={p?.section} />
                <div style={{ fontWeight:700, fontSize:14, color:C.text, marginTop:8, marginBottom:2 }}>{p?.full_name?.split(' ')[0]}</div>
                <div style={{ fontSize:11, color:C.text3 }}>{p?.section}</div>
                <div style={{ marginTop:10, fontSize:22, fontWeight:800, color:RANK_COLORS[rank-1] }}>{p?.points||0}</div>
                <div style={{ fontSize:11, color:C.text3 }}>points</div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab toggle */}
      <div style={{ display:'flex', background:C.bg3, borderRadius:8, padding:4, marginBottom:'1rem', width:'fit-content' }}>
        {[['points','Points'],['badges','Badges']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding:'7px 20px', borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', background:tab===t?C.surface:'transparent', color:tab===t?C.text:C.text3, transition:'all 0.15s' }}>{l}</button>
        ))}
      </div>

      <Card style={{ padding:0, overflow:'hidden' }}>
        {loading ? <div style={{ textAlign:'center', padding:'3rem', color:C.text3 }}>Loading leaderboard…</div> : (
          <div>
            {sorted.map((p, i) => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', background: i < 3 ? `${RANK_COLORS[i]}08` : 'transparent' }}>
                <div style={{ width:32, textAlign:'center', fontWeight:800, fontSize:16, color: i < 3 ? RANK_COLORS[i] : C.text3, flexShrink:0 }}>
                  {i < 3 ? RANK_ICO[i] : `#${i+1}`}
                </div>
                <Avatar name={p.full_name} size={38} section={p.section} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{p.full_name}</div>
                  <div style={{ fontSize:12, color:C.text3 }}>{p.section || 'Club Member'}</div>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end', maxWidth:200 }}>
                  {(p.badges || []).slice(0,3).map(b => {
                    const bd = BADGES_DEF.find(x => x.id === b);
                    return bd ? <Badge key={b} label={bd.label} color={bd.color} /> : null;
                  })}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:800, fontSize:18, color:i<3?RANK_COLORS[i]:C.primary2 }}>{p.points||0}</div>
                  <div style={{ fontSize:11, color:C.text3 }}>pts</div>
                </div>
              </div>
            ))}
            {sorted.length === 0 && <div style={{ textAlign:'center', padding:'3rem', color:C.text3 }}>No members have earned points yet.</div>}
          </div>
        )}
      </Card>

      {/* Badge legend */}
      <Card style={{ marginTop:'1.5rem' }}>
        <h3 style={{ fontWeight:700, color:C.text, marginBottom:14 }}>🎖️ Badge Legend</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
          {BADGES_DEF.map(b => (
            <div key={b.id} style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', background:C.bg3, borderRadius:8 }}>
              <span style={{ fontSize:22 }}>{b.label.split(' ')[0]}</span>
              <div>
                <div style={{ fontWeight:600, fontSize:13, color:C.text }}>{b.label.split(' ').slice(1).join(' ')}</div>
                <div style={{ fontSize:12, color:C.text3 }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

import{useEffect,useState}from'react';
import{supabase}from'../lib/supabase';
import{Avatar,Badge,Card,C}from'../components/UI';
const BADGE_DEFS=[{id:'pioneer',label:'🚀 Pioneer',desc:'First to join',color:'red'},{id:'innovator',label:'🧠 Innovator',desc:'5+ ideas submitted',color:'amber'},{id:'builder',label:'🛠 Builder',desc:'Part of 3+ teams',color:'teal'},{id:'top_voter',label:'🗳️ Top Voter',desc:'10+ votes cast',color:'blue'},{id:'collaborator',label:'🤝 Collaborator',desc:'Joined 5+ teams',color:'purple'},{id:'trending',label:'🔥 Trending',desc:'Top-voted idea',color:'red'},{id:'mentor_pick',label:'⭐ Mentor Pick',desc:'Idea approved by mentor',color:'amber'}];
const RANK_COLORS=['#FFD700','#C0C0C0','#CD7F32'];
const RANK_ICO=['🥇','🥈','🥉'];
const SECS=['TOURISM','ELECTRICAL','FOOD & BEVERAGE','BUILDING & CONSTRUCTION','COSMETOLOGY','PLUMBING','ICT','FASHION','BUSINESS','MECHANICAL'];
export default function Leaderboard(){
  const[profiles,setProfiles]=useState([]);
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState('points');
  const[deptFilter,setDeptFilter]=useState('');
  useEffect(()=>{
    async function load(){setLoading(true);const{data}=await supabase.from('profiles').select('id,full_name,section,points,badges,role,is_active,avatar_url').in('role',['member']).eq('is_active',true).order('points',{ascending:false});setProfiles(data||[]);setLoading(false);}
    load();
  },[]);
  let filtered=[...profiles];
  if(deptFilter)filtered=filtered.filter(p=>p.section===deptFilter);
  const sorted=tab==='points'?filtered.sort((a,b)=>(b.points||0)-(a.points||0)):filtered.sort((a,b)=>(b.badges?.length||0)-(a.badges?.length||0));
  return(
    <div>
      <div style={{marginBottom:'1.25rem'}}><h2 style={{fontSize:22,fontWeight:800,color:C.text}}>🏆 Leaderboard</h2><p style={{color:C.text3,fontSize:13,marginTop:2}}>Top innovators ranked by contribution points</p></div>
      <div style={{display:'flex',gap:10,marginBottom:'1rem',flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',background:C.bg3,borderRadius:8,padding:4}}>
          {[['points','Points'],['badges','Badges']].map(([t,l])=><button key={t} onClick={()=>setTab(t)} style={{padding:'6px 16px',borderRadius:6,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit',background:tab===t?C.surface:'transparent',color:tab===t?C.text:C.text3,transition:'all 0.15s'}}>{l}</button>)}
        </div>
        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{padding:'7px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text2,fontSize:13,fontFamily:'inherit'}}>
          <option value="">All Departments</option>{SECS.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>
      {!loading&&sorted.length>=3&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr 1fr',gap:12,marginBottom:'1.5rem',alignItems:'flex-end'}}>
          {[sorted[1],sorted[0],sorted[2]].map((p,i)=>{const rank=i===1?1:i===0?2:3;return(
            <Card key={p?.id} style={{textAlign:'center',padding:'1.25rem 1rem',background:rank===1?`linear-gradient(135deg,#1a1440,${C.surface})`:C.surface,border:`1px solid ${rank===1?C.primary:C.border}`}}>
              <div style={{fontSize:28,marginBottom:8}}>{RANK_ICO[rank-1]}</div>
              <Avatar name={p?.full_name||'?'} size={52} section={p?.section} url={p?.avatar_url}/>
              <div style={{fontWeight:700,fontSize:14,color:C.text,marginTop:8,marginBottom:2}}>{p?.full_name?.split(' ')[0]}</div>
              <div style={{fontSize:11,color:C.text3,marginBottom:6}}>{p?.section}</div>
              <div style={{fontSize:22,fontWeight:800,color:RANK_COLORS[rank-1]}}>{p?.points||0}</div>
              <div style={{fontSize:11,color:C.text3}}>points</div>
            </Card>
          );})}
        </div>
      )}
      <Card style={{padding:0,overflow:'hidden',marginBottom:'1.5rem'}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.border}`,fontWeight:700,color:C.text,fontSize:14}}>Full Rankings — {sorted.length} members</div>
        {loading?<div style={{textAlign:'center',padding:'3rem',color:C.text3}}>Loading…</div>:sorted.length===0?<div style={{textAlign:'center',padding:'3rem',color:C.text3}}>No members on leaderboard yet</div>:(
          sorted.map((p,i)=>(
            <div key={p.id} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderTop:i>0?`1px solid ${C.border}`:'none',background:i<3?`${RANK_COLORS[i]}08`:'transparent'}}>
              <div style={{width:32,textAlign:'center',fontWeight:800,fontSize:16,color:i<3?RANK_COLORS[i]:C.text3,flexShrink:0}}>{i<3?RANK_ICO[i]:`#${i+1}`}</div>
              <Avatar name={p.full_name} size={38} section={p.section} url={p.avatar_url}/>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:C.text}}>{p.full_name}</div><div style={{fontSize:12,color:C.text3}}>{p.section||'Club Member'}</div></div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end',maxWidth:200}}>{(p.badges||[]).slice(0,3).map(b=>{const bd=BADGE_DEFS.find(x=>x.id===b);return bd?<Badge key={b} label={bd.label} color={bd.color}/>:null;})}</div>
              <div style={{textAlign:'right',flexShrink:0}}><div style={{fontWeight:800,fontSize:18,color:i<3?RANK_COLORS[i]:C.primary2}}>{p.points||0}</div><div style={{fontSize:11,color:C.text3}}>pts</div></div>
            </div>
          ))
        )}
      </Card>
      <Card>
        <h3 style={{fontWeight:700,color:C.text,marginBottom:14}}>🏅 Badge Guide</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10}}>
          {BADGE_DEFS.map(b=><div key={b.id} style={{display:'flex',gap:10,alignItems:'center',padding:'10px 12px',background:C.bg3,borderRadius:8}}>
            <span style={{fontSize:22}}>{b.label.split(' ')[0]}</span>
            <div><div style={{fontWeight:600,fontSize:13,color:C.text}}>{b.label.split(' ').slice(1).join(' ')}</div><div style={{fontSize:12,color:C.text3}}>{b.desc}</div></div>
          </div>)}
        </div>
      </Card>
    </div>
  );
}

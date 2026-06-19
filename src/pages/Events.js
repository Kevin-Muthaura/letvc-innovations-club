import{useEffect,useState,useCallback}from'react';
import{supabase,logAudit}from'../lib/supabase';
import{useAuth}from'../context/AuthContext';
import{Badge,Btn,Inp,Sel,Txt,Card,Modal,Confirm,Empty,useToast,C}from'../components/UI';
const TYPES=['hackathon','workshop','pitch_night','meeting','excursion','competition'];
const TYPE_C={hackathon:'red',workshop:'blue',pitch_night:'green',meeting:'purple',excursion:'teal',competition:'amber'};
const TYPE_ICO={hackathon:'code',workshop:'tools',pitch_night:'presentation',meeting:'users',excursion:'map',competition:'trophy'};
const BLANK={title:'',description:'',event_date:'',event_time:'',venue:'',virtual_link:'',event_type:'workshop',organizer:'LETVC Innovations Club',max_attendees:100};
export default function Events(){
  const{isAdmin,profile}=useAuth();
  const{show,Toasts}=useToast();
  const[events,setEvents]=useState([]);
  const[loading,setLoad]=useState(true);
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState(BLANK);
  const[saving,setSaving]=useState(false);
  const[delEvt,setDelEvt]=useState(null);
  const[tab,setTab]=useState('upcoming');
  const load=useCallback(async()=>{setLoad(true);const{data}=await supabase.from('events').select('*').order('event_date');setEvents(data||[]);setLoad(false);},[]);
  useEffect(()=>{load();},[load]);
  async function save(){
    if(!form.title.trim())return show('Event title required','error');
    setSaving(true);
    try{
      if(modal==='add'){const{data}=await supabase.from('events').insert(form).select().single();setEvents(e=>[...e,data].sort((a,b)=>a.event_date?.localeCompare(b.event_date)));await logAudit('ADD_EVENT','events',data.id,profile?.full_name);show('Event created!');}
      else{const{data}=await supabase.from('events').update(form).eq('id',modal.id).select().single();setEvents(e=>e.map(x=>x.id===modal.id?data:x));show('Event updated');}
      setModal(null);setForm(BLANK);
    }catch(ex){show(ex.message,'error');}
    setSaving(false);
  }
  async function doDelete(){await supabase.from('events').delete().eq('id',delEvt.id);setEvents(e=>e.filter(x=>x.id!==delEvt.id));show('Event deleted');setDelEvt(null);}
  const today=new Date().toISOString().slice(0,10);
  const upcoming=events.filter(e=>!e.event_date||e.event_date>=today);
  const past=events.filter(e=>e.event_date&&e.event_date<today);
  const displayed=tab==='upcoming'?upcoming:past;
  const openEdit=e=>{setForm({title:e.title,description:e.description||'',event_date:e.event_date||'',event_time:e.event_time||'',venue:e.venue||'',virtual_link:e.virtual_link||'',event_type:e.event_type,organizer:e.organizer,max_attendees:e.max_attendees});setModal({id:e.id});};
  return(
    <div>
      <Toasts/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem',gap:10,flexWrap:'wrap'}}>
        <div><h2 style={{fontSize:22,fontWeight:800,color:C.text}}>📅 Events & Activities</h2><p style={{color:C.text3,fontSize:13,marginTop:2}}>{upcoming.length} upcoming · {past.length} past</p></div>
        {isAdmin&&<Btn variant="primary" icon="plus" onClick={()=>{setForm(BLANK);setModal('add');}}>New Event</Btn>}
      </div>
      <div style={{display:'flex',background:C.bg3,borderRadius:8,padding:4,marginBottom:'1rem',width:'fit-content'}}>
        {['upcoming','past'].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:'7px 20px',borderRadius:6,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit',background:tab===t?C.surface:'transparent',color:tab===t?C.text:C.text3,transition:'all 0.15s'}}>{t.charAt(0).toUpperCase()+t.slice(1)} ({t==='upcoming'?upcoming.length:past.length})</button>)}
      </div>
      {loading&&<div style={{textAlign:'center',padding:'3rem',color:C.text3}}>Loading…</div>}
      {!loading&&displayed.length===0&&<Empty icon="calendar-off" message={`No ${tab} events`} action={isAdmin&&tab==='upcoming'&&<Btn variant="primary" icon="plus" onClick={()=>{setForm(BLANK);setModal('add');}}>Schedule first event</Btn>}/>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
        {displayed.map(e=>(
          <Card key={e.id} style={{opacity:tab==='past'?0.7:1}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{width:42,height:42,borderRadius:10,background:C.bg3,display:'flex',alignItems:'center',justifyContent:'center'}}><i className={`ti ti-${TYPE_ICO[e.event_type]||'calendar'}`} style={{fontSize:20,color:C.primary2}}/></div>
              <Badge label={e.event_type.replace('_',' ')} color={TYPE_C[e.event_type]||'blue'}/>
            </div>
            <h3 style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:6}}>{e.title}</h3>
            {e.description&&<p style={{fontSize:13,color:C.text2,marginBottom:10,lineHeight:1.5}}>{e.description}</p>}
            <div style={{fontSize:12,color:C.text3,display:'flex',flexDirection:'column',gap:5,marginBottom:12}}>
              {e.event_date&&<span><i className="ti ti-calendar" style={{marginRight:5}}/>{e.event_date}{e.event_time&&` · ${e.event_time}`}</span>}
              {e.venue&&<span><i className="ti ti-map-pin" style={{marginRight:5}}/>{e.venue}</span>}
              {e.virtual_link&&<a href={e.virtual_link} target="_blank" rel="noreferrer" style={{color:C.primary2}}><i className="ti ti-link" style={{marginRight:5}}/>Join online</a>}
              <span><i className="ti ti-user" style={{marginRight:5}}/>{e.organizer}</span>
            </div>
            {isAdmin&&<div style={{display:'flex',gap:6}}><Btn size="sm" icon="edit" onClick={()=>openEdit(e)}>Edit</Btn><Btn size="sm" danger icon="trash" onClick={()=>setDelEvt(e)}>Delete</Btn></div>}
          </Card>
        ))}
      </div>
      {modal&&(
        <Modal title={modal==='add'?'Schedule New Event':'Edit Event'} onClose={()=>{setModal(null);setForm(BLANK);}} width={560}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <Inp label="Event Title" value={form.title} onChange={v=>setForm({...form,title:v})} required span={2}/>
            <Txt label="Description" value={form.description} onChange={v=>setForm({...form,description:v})} rows={3} span={2}/>
            <Inp label="Date" value={form.event_date} onChange={v=>setForm({...form,event_date:v})} type="date"/>
            <Inp label="Time" value={form.event_time} onChange={v=>setForm({...form,event_time:v})} placeholder="e.g. 10:00 AM"/>
            <Inp label="Venue" value={form.venue} onChange={v=>setForm({...form,venue:v})} placeholder="e.g. Main Hall"/>
            <Inp label="Virtual Link" value={form.virtual_link} onChange={v=>setForm({...form,virtual_link:v})} placeholder="https://…"/>
            <Sel label="Event Type" value={form.event_type} onChange={v=>setForm({...form,event_type:v})} options={TYPES}/>
            <Inp label="Organizer" value={form.organizer} onChange={v=>setForm({...form,organizer:v})}/>
          </div>
          <div style={{marginTop:'1.25rem',display:'flex',gap:10,justifyContent:'flex-end'}}>
            <Btn onClick={()=>{setModal(null);setForm(BLANK);}}>Cancel</Btn>
            <Btn variant="primary" icon="device-floppy" onClick={save} disabled={saving}>{saving?'Saving…':'Save Event'}</Btn>
          </div>
        </Modal>
      )}
      {delEvt&&<Confirm message={`Delete event "${delEvt.title}"?`} onConfirm={doDelete} onCancel={()=>setDelEvt(null)}/>}
    </div>
  );
}

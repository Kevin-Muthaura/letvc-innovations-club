import { useEffect, useState, useCallback } from 'react';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Badge, Btn, Inp, Sel, Txt, Card, Modal, Confirm, Empty, useToast, C } from '../components/UI';

const TYPE_C = { physical:'green', virtual:'blue' };
const BLANK = { title:'', description:'', meeting_date:'', meeting_time:'', type:'physical', venue:'', virtual_link:'' };

export default function Meetings() {
  const { isAdmin, profile } = useAuth();
  const { show, Toasts }     = useToast();
  const [meetings,  setMeetings]  = useState([]);
  const [members,   setMembers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [form,      setForm]      = useState(BLANK);
  const [saving,    setSaving]    = useState(false);
  const [delItem,   setDelItem]   = useState(null);
  const [attModal,  setAttModal]  = useState(null); // meeting for attendance
  const [attendance,setAttendance]= useState([]);
  const [marked,    setMarked]    = useState({}); // {member_id: true}

  const load = useCallback(async () => {
    setLoading(true);
    const [mRes, memRes] = await Promise.all([
      supabase.from('meetings').select('*').order('meeting_date',{ascending:false}),
      supabase.from('members').select('id,full_name,section').eq('status','active').order('full_name'),
    ]);
    setMeetings(mRes.data||[]);
    setMembers(memRes.data||[]);
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  async function openAttendance(meeting) {
    setAttModal(meeting);
    const { data } = await supabase.from('attendance').select('member_id').eq('meeting_id', meeting.id);
    const m = {};
    (data||[]).forEach(a=>{ m[a.member_id]=true; });
    setMarked(m);
    setAttendance(data||[]);
  }

  async function toggleAttendance(memberId, memberName) {
    if (marked[memberId]) {
      await supabase.from('attendance').delete().eq('meeting_id',attModal.id).eq('member_id',memberId);
      setMarked(m=>{ const n={...m}; delete n[memberId]; return n; });
      show(`${memberName} unmarked`,'warning');
    } else {
      await supabase.from('attendance').insert({ meeting_id:attModal.id, member_id:memberId, member_name:memberName });
      setMarked(m=>({...m,[memberId]:true}));
      show(`${memberName} marked present ✅`);
    }
  }

  async function markAll() {
    const inserts = members.filter(m=>!marked[m.id]).map(m=>({ meeting_id:attModal.id, member_id:m.id, member_name:m.full_name }));
    if (inserts.length) {
      await supabase.from('attendance').insert(inserts);
      const nm={};members.forEach(m=>{ nm[m.id]=true; });
      setMarked(nm); show('All members marked present ✅');
    }
  }

  function exportCSV() {
    if (!attModal) return;
    const present = members.filter(m=>marked[m.id]);
    const absent  = members.filter(m=>!marked[m.id]);
    const rows = [
      [`Meeting: ${attModal.title}`],
      [`Date: ${attModal.meeting_date}`],
      [`Venue: ${attModal.venue||attModal.virtual_link||'—'}`],
      [],
      ['Name','Section','Status'],
      ...present.map(m=>[m.full_name,m.section,'Present']),
      ...absent.map(m=>[m.full_name,m.section,'Absent']),
      [],
      [`Total Present: ${present.length}`],
      [`Total Absent: ${absent.length}`],
    ];
    const csv = rows.map(r=>r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `attendance_${attModal.title.replace(/\s+/g,'_')}.csv`;
    a.click();
    show('Attendance register downloaded 📄');
  }

  async function save() {
    if (!form.title.trim()||!form.meeting_date) return show('Title and date required','error');
    setSaving(true);
    try {
      const payload = { ...form, created_by:profile?.id, created_by_name:profile?.full_name||'Admin' };
      if (modal==='add') {
        const { data } = await supabase.from('meetings').insert(payload).select().single();
        setMeetings(m=>[data,...m]);
        await logAudit('ADD_MEETING','meetings',data.id,profile?.full_name,`Added: ${data.title}`);
        show('Meeting created ✅');
      } else {
        const { data } = await supabase.from('meetings').update(form).eq('id',modal.id).select().single();
        setMeetings(m=>m.map(x=>x.id===modal.id?data:x));
        show('Meeting updated');
      }
      setModal(null); setForm(BLANK);
    } catch(ex) { show(ex.message,'error'); }
    setSaving(false);
  }

  async function doDelete() {
    await supabase.from('meetings').delete().eq('id',delItem.id);
    setMeetings(m=>m.filter(x=>x.id!==delItem.id));
    show('Meeting deleted'); setDelItem(null);
  }

  const today = new Date().toISOString().slice(0,10);
  const upcoming = meetings.filter(m=>m.meeting_date>=today);
  const past     = meetings.filter(m=>m.meeting_date<today);

  return (
    <div>
      <Toasts/>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem',gap:10,flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:22,fontWeight:800,color:C.text }}>📋 Meetings & Attendance</h2>
          <p style={{ color:C.text3,fontSize:13,marginTop:2 }}>Schedule meetings and track who attends</p>
        </div>
        {isAdmin&&<Btn variant="primary" icon="plus" onClick={()=>{ setForm(BLANK); setModal('add'); }}>New Meeting</Btn>}
      </div>

      {loading&&<div style={{ textAlign:'center',padding:'3rem',color:C.text3 }}>Loading…</div>}

      {upcoming.length>0&&(
        <>
          <h3 style={{ fontSize:14,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10 }}>Upcoming</h3>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14,marginBottom:'1.5rem' }}>
            {upcoming.map(m=><MeetingCard key={m.id} m={m} isAdmin={isAdmin} onAttend={()=>openAttendance(m)} onEdit={()=>{ setForm({title:m.title,description:m.description,meeting_date:m.meeting_date,meeting_time:m.meeting_time||'',type:m.type,venue:m.venue||'',virtual_link:m.virtual_link||''}); setModal({id:m.id}); }} onDelete={()=>setDelItem(m)} markedCount={0}/>)}
          </div>
        </>
      )}

      {past.length>0&&(
        <>
          <h3 style={{ fontSize:14,fontWeight:700,color:C.text2,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10 }}>Past Meetings</h3>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14 }}>
            {past.map(m=><MeetingCard key={m.id} m={m} isAdmin={isAdmin} onAttend={()=>openAttendance(m)} onEdit={()=>{ setForm({title:m.title,description:m.description,meeting_date:m.meeting_date,meeting_time:m.meeting_time||'',type:m.type,venue:m.venue||'',virtual_link:m.virtual_link||''}); setModal({id:m.id}); }} onDelete={()=>setDelItem(m)} past/>)}
          </div>
        </>
      )}

      {!loading&&meetings.length===0&&<Empty icon="users-group" message="No meetings scheduled yet" action={isAdmin&&<Btn variant="primary" icon="plus" onClick={()=>{ setForm(BLANK); setModal('add'); }}>Schedule first meeting</Btn>}/>}

      {/* Attendance Modal */}
      {attModal&&(
        <Modal title={`Attendance — ${attModal.title}`} onClose={()=>setAttModal(null)} width={600}>
          <div style={{ marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8 }}>
            <div style={{ fontSize:13,color:C.text2 }}>
              <i className="ti ti-calendar" style={{ marginRight:4 }}/>{attModal.meeting_date}
              {attModal.venue&&<><span style={{ margin:'0 8px' }}>·</span><i className="ti ti-map-pin" style={{ marginRight:4 }}/>{attModal.venue}</>}
              <span style={{ margin:'0 8px' }}>·</span>
              <span style={{ color:C.success,fontWeight:600 }}>{Object.keys(marked).length} present</span>
              <span style={{ margin:'0 6px' }}>/</span>
              <span style={{ color:C.danger }}>{members.length-Object.keys(marked).length} absent</span>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              {isAdmin&&<Btn size="sm" icon="users" onClick={markAll}>Mark All Present</Btn>}
              <Btn size="sm" variant="primary" icon="download" onClick={exportCSV}>Download Register</Btn>
            </div>
          </div>
          <div style={{ maxHeight:400,overflowY:'auto',border:`1px solid ${C.border}`,borderRadius:8,overflow:'hidden' }}>
            {members.map((mem,i)=>(
              <div key={mem.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderTop:i>0?`1px solid ${C.border}`:'none',background:marked[mem.id]?C.successBg:'transparent',cursor:'pointer',transition:'background 0.15s' }} onClick={()=>toggleAttendance(mem.id,mem.full_name)}>
                <div style={{ width:28,height:28,borderRadius:'50%',background:marked[mem.id]?C.success:C.bg3,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background 0.15s' }}>
                  {marked[mem.id]?<i className="ti ti-check" style={{ color:'#fff',fontSize:16 }}/>:<i className="ti ti-circle" style={{ color:C.text3,fontSize:16 }}/>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600,fontSize:14,color:C.text }}>{mem.full_name}</div>
                  <div style={{ fontSize:12,color:C.text3 }}>{mem.section}</div>
                </div>
                <Badge label={marked[mem.id]?'Present':'Absent'} color={marked[mem.id]?'green':'gray'}/>
              </div>
            ))}
          </div>
          <p style={{ fontSize:12,color:C.text3,marginTop:10 }}>Click a member to toggle their attendance. Download the register as CSV when done.</p>
        </Modal>
      )}

      {modal&&(
        <Modal title={modal==='add'?'Schedule New Meeting':'Edit Meeting'} onClose={()=>{ setModal(null); setForm(BLANK); }} width={520}>
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <Inp label="Meeting Title" value={form.title} onChange={v=>setForm({...form,title:v})} required placeholder="e.g. Monthly Club Meeting"/>
            <Txt label="Description" value={form.description} onChange={v=>setForm({...form,description:v})} rows={2}/>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <Inp label="Date" value={form.meeting_date} onChange={v=>setForm({...form,meeting_date:v})} type="date" required/>
              <Inp label="Time" value={form.meeting_time} onChange={v=>setForm({...form,meeting_time:v})} placeholder="e.g. 10:00 AM"/>
            </div>
            <Sel label="Type" value={form.type} onChange={v=>setForm({...form,type:v})} options={['physical','virtual']}/>
            {form.type==='physical'?<Inp label="Venue" value={form.venue} onChange={v=>setForm({...form,venue:v})} placeholder="e.g. Main Hall"/>:<Inp label="Virtual Link" value={form.virtual_link} onChange={v=>setForm({...form,virtual_link:v})} placeholder="https://meet.google.com/…"/>}
          </div>
          <div style={{ marginTop:'1.25rem',display:'flex',gap:10,justifyContent:'flex-end' }}>
            <Btn onClick={()=>{ setModal(null); setForm(BLANK); }}>Cancel</Btn>
            <Btn variant="primary" icon="device-floppy" onClick={save} disabled={saving}>{saving?'Saving…':'Save Meeting'}</Btn>
          </div>
        </Modal>
      )}
      {delItem&&<Confirm message={`Delete meeting "${delItem.title}"? Attendance records will also be deleted.`} onConfirm={doDelete} onCancel={()=>setDelItem(null)}/>}
    </div>
  );
}

function MeetingCard({ m, isAdmin, onAttend, onEdit, onDelete, past }) {
  return (
    <Card style={{ opacity:past?0.75:1 }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
        <div style={{ width:40,height:40,borderRadius:10,background:C.bg3,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <i className={`ti ti-${m.type==='virtual'?'video':'users-group'}`} style={{ fontSize:20,color:C.primary2 }}/>
        </div>
        <Badge label={m.type} color={m.type==='virtual'?'blue':'green'}/>
      </div>
      <h3 style={{ fontWeight:700,fontSize:15,color:C.text,marginBottom:6 }}>{m.title}</h3>
      {m.description&&<p style={{ fontSize:13,color:C.text2,marginBottom:10,lineHeight:1.5 }}>{m.description}</p>}
      <div style={{ fontSize:12,color:C.text3,display:'flex',flexDirection:'column',gap:3,marginBottom:12 }}>
        <span><i className="ti ti-calendar" style={{ marginRight:5 }}/>{m.meeting_date}{m.meeting_time&&` · ${m.meeting_time}`}</span>
        {m.venue&&<span><i className="ti ti-map-pin" style={{ marginRight:5 }}/>{m.venue}</span>}
        {m.virtual_link&&<a href={m.virtual_link} target="_blank" rel="noreferrer" style={{ color:C.primary2 }}><i className="ti ti-link" style={{ marginRight:5 }}/>Join online</a>}
      </div>
      <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
        <Btn size="sm" variant="primary" icon="clipboard-check" onClick={onAttend}>Attendance</Btn>
        {isAdmin&&<><Btn size="sm" icon="edit" onClick={onEdit}>Edit</Btn><Btn size="sm" danger icon="trash" onClick={onDelete}>Delete</Btn></>}
      </div>
    </Card>
  );
}

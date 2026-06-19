import { useEffect, useState, useCallback } from 'react';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Badge, Btn, Inp, Txt, Card, Modal, Confirm, Empty, useToast, C } from '../components/UI';
const PRI_C={high:'red',medium:'amber',low:'blue'};
const PRI_ICO={high:'alert-circle',medium:'info-circle',low:'bell'};
const BLANK={title:'',body:'',priority:'medium'};
export default function Announcements(){
  const{isAdmin,profile}=useAuth();
  const{show,Toasts}=useToast();
  const[items,setItems]=useState([]);
  const[loading,setLoad]=useState(true);
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState(BLANK);
  const[saving,setSaving]=useState(false);
  const[delItem,setDelItem]=useState(null);
  const load=useCallback(async()=>{setLoad(true);const{data}=await supabase.from('announcements').select('*').order('post_date',{ascending:false}).order('id',{ascending:false});setItems(data||[]);setLoad(false);},[]);
  useEffect(()=>{load();},[load]);
  async function save(){
    if(!form.title.trim()||!form.body.trim())return show('Title and body required','error');
    setSaving(true);
    try{
      if(modal==='add'){const{data,error}=await supabase.from('announcements').insert({...form,posted_by:profile?.full_name||'Admin'}).select().single();if(error)throw error;setItems(i=>[data,...i]);await logAudit('ADD_ANNOUNCEMENT','announcements',data.id,profile?.full_name);show('Announcement posted');}
      else{const{data,error}=await supabase.from('announcements').update({title:form.title,body:form.body,priority:form.priority}).eq('id',modal.id).select().single();if(error)throw error;setItems(i=>i.map(x=>x.id===modal.id?data:x));show('Updated');}
      setModal(null);setForm(BLANK);
    }catch(ex){show(ex.message,'error');}
    setSaving(false);
  }
  async function doDelete(){await supabase.from('announcements').delete().eq('id',delItem.id);setItems(i=>i.filter(x=>x.id!==delItem.id));show('Deleted');setDelItem(null);}
  return(
    <div>
      <Toasts/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem',gap:10,flexWrap:'wrap'}}>
        <div><h2 style={{fontSize:22,fontWeight:800,color:C.text}}>📢 Announcements</h2><p style={{color:C.text3,fontSize:13,marginTop:2}}>Club notices and updates</p></div>
        {isAdmin&&<Btn variant="primary" icon="speakerphone" onClick={()=>{setForm(BLANK);setModal('add');}}>Post Announcement</Btn>}
      </div>
      {loading&&<div style={{textAlign:'center',padding:'3rem',color:C.text3}}>Loading…</div>}
      {!loading&&items.length===0&&<Empty icon="speakerphone" message="No announcements yet" action={isAdmin&&<Btn variant="primary" icon="speakerphone" onClick={()=>{setForm(BLANK);setModal('add');}}>Post first announcement</Btn>}/>}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {items.map(a=>(
          <Card key={a.id}>
            <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
              <div style={{width:40,height:40,borderRadius:10,background:a.priority==='high'?C.dangerBg:a.priority==='medium'?C.warnBg:C.primaryBg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className={`ti ti-${PRI_ICO[a.priority]}`} style={{fontSize:20,color:a.priority==='high'?C.danger:a.priority==='medium'?C.warn:C.primary2}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:6}}>
                  <h3 style={{fontWeight:700,fontSize:15,color:C.text}}>{a.title}</h3>
                  <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}><Badge label={a.priority} color={PRI_C[a.priority]}/><span style={{fontSize:11,color:C.text3}}>{a.post_date}</span></div>
                </div>
                <p style={{fontSize:14,color:C.text2,lineHeight:1.6}}>{a.body}</p>
                <div style={{fontSize:12,color:C.text3,marginTop:8}}>Posted by {a.posted_by}</div>
                {isAdmin&&<div style={{display:'flex',gap:6,marginTop:10}}>
                  <Btn size="sm" icon="edit" onClick={()=>{setForm({title:a.title,body:a.body,priority:a.priority});setModal({id:a.id});}}>Edit</Btn>
                  <Btn size="sm" danger icon="trash" onClick={()=>setDelItem(a)}>Delete</Btn>
                </div>}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {modal&&(
        <Modal title={modal==='add'?'Post Announcement':'Edit Announcement'} onClose={()=>{setModal(null);setForm(BLANK);}} width={540}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <Inp label="Title" value={form.title} onChange={v=>setForm({...form,title:v})} required/>
            <Txt label="Message" value={form.body} onChange={v=>setForm({...form,body:v})} rows={5} required/>
            <div><label style={{fontSize:11,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'0.5px',display:'block',marginBottom:8}}>Priority</label>
              <div style={{display:'flex',gap:8}}>
                {['high','medium','low'].map(p=><button key={p} onClick={()=>setForm({...form,priority:p})} style={{flex:1,padding:'8px',borderRadius:8,border:`1px solid ${form.priority===p?(p==='high'?C.danger:p==='medium'?C.warn:C.primary2):C.border}`,background:form.priority===p?(p==='high'?C.dangerBg:p==='medium'?C.warnBg:C.primaryBg):'transparent',color:form.priority===p?(p==='high'?C.danger:p==='medium'?C.warn:C.primary2):C.text3,cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:13,textTransform:'capitalize'}}>{p}</button>)}
              </div>
            </div>
          </div>
          <div style={{marginTop:'1.25rem',display:'flex',gap:10,justifyContent:'flex-end'}}>
            <Btn onClick={()=>{setModal(null);setForm(BLANK);}}>Cancel</Btn>
            <Btn variant="primary" icon="send" onClick={save} disabled={saving}>{saving?'Posting…':'Post'}</Btn>
          </div>
        </Modal>
      )}
      {delItem&&<Confirm message={`Delete announcement "${delItem.title}"?`} onConfirm={doDelete} onCancel={()=>setDelItem(null)}/>}
    </div>
  );
}

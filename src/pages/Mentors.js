import { useEffect, useState, useCallback } from 'react';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Btn, Inp, Txt, Card, Modal, Confirm, Empty, useToast, C } from '../components/UI';

const AREAS = ['HOSPITALITY','TOURISM','COSMETOLOGY','FASHION','BUSINESS','ROBOTICS','ELECTRICAL AND ELECTRONICS','MECHANICAL','BUILDING','ICT','OTHER'];
const BLANK  = { full_name:'', technical_area:'', phone:'', email:'', bio:'' };

export default function Mentors() {
  const { isAdmin, profile } = useAuth();
  const { show, Toasts }     = useToast();
  const [mentors,  setMentors] = useState([]);
  const [loading,  setLoading] = useState(true);
  const [modal,    setModal]   = useState(null);
  const [form,     setForm]    = useState(BLANK);
  const [saving,   setSaving]  = useState(false);
  const [delItem,  setDelItem] = useState(null);
  const [selected, setSelected]= useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('mentors').select('*').order('full_name');
    setMentors(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(BLANK); setModal('add'); };
  const openEdit = m  => { setForm({ full_name:m.full_name, technical_area:m.technical_area||'', phone:m.phone||'', email:m.email||'', bio:m.bio||'' }); setModal({ type:'edit', id:m.id }); };

  async function save() {
    if (!form.full_name.trim()) return show('Name required','error');
    setSaving(true);
    try {
      const payload = { ...form, full_name: form.full_name.toUpperCase() };
      if (modal === 'add') {
        const { data, error } = await supabase.from('mentors').insert(payload).select().single();
        if (error) throw error;
        setMentors(m => [...m, data]);
        await logAudit('ADD_MENTOR','mentors',data.id,profile?.full_name,`Added: ${data.full_name}`);
        show('Mentor added');
      } else {
        const { data, error } = await supabase.from('mentors').update(payload).eq('id', modal.id).select().single();
        if (error) throw error;
        setMentors(m => m.map(x => x.id === modal.id ? data : x));
        if (selected?.id === modal.id) setSelected(data);
        show('Mentor updated');
      }
      setModal(null);
    } catch (ex) { show(ex.message, 'error'); }
    setSaving(false);
  }

  async function doDelete() {
    await supabase.from('mentors').delete().eq('id', delItem.id);
    setMentors(m => m.filter(x => x.id !== delItem.id));
    if (selected?.id === delItem.id) setSelected(null);
    await logAudit('DELETE_MENTOR','mentors',delItem.id,profile?.full_name);
    show('Mentor removed'); setDelItem(null);
  }

  const AREA_COLORS = { 'ROBOTICS':'blue','ELECTRICAL AND ELECTRONICS':'purple','ICT':'blue','BUSINESS':'amber','COSMETOLOGY':'pink','FASHION':'pink','BUILDING':'green','MECHANICAL':'teal','HOSPITALITY':'teal','TOURISM':'teal' };

  return (
    <div>
      <Toasts />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', gap:10, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>🧑‍🏫 Technical Mentors</h2>
          <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>{mentors.length} mentors registered</p>
        </div>
        {isAdmin && <Btn variant="primary" icon="user-plus" onClick={openAdd}>Add Mentor</Btn>}
      </div>

      {loading && <div style={{ textAlign:'center', padding:'3rem', color:C.text3 }}>Loading…</div>}
      {!loading && mentors.length === 0 && <Empty icon="user-star" message="No mentors yet" action={isAdmin && <Btn variant="primary" icon="user-plus" onClick={openAdd}>Add first mentor</Btn>} />}

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 300px' : 'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
        <div style={{ display: selected ? 'flex' : 'grid', flexDirection: selected ? 'column' : undefined, gridTemplateColumns: selected ? undefined : 'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
          {mentors.map(m => (
            <Card key={m.id} onClick={() => setSelected(sel => sel?.id === m.id ? null : m)} highlight={selected?.id === m.id} style={{ cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                <Avatar name={m.full_name} size={44} color={C.accent} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{m.full_name}</div>
                  <Badge label={m.technical_area||'General'} color={AREA_COLORS[m.technical_area]||'gray'} />
                </div>
                <div style={{ width:10, height:10, borderRadius:'50%', background: m.is_active ? C.success : C.text3, marginTop:4, flexShrink:0 }} title={m.is_active?'Active':'Inactive'} />
              </div>
              {m.bio && <p style={{ fontSize:13, color:C.text2, lineHeight:1.5, marginBottom:8 }}>{m.bio}</p>}
              <div style={{ fontSize:12, color:C.text3, display:'flex', flexDirection:'column', gap:3 }}>
                {m.phone && <span><i className="ti ti-phone" style={{ marginRight:5 }}/>{m.phone}</span>}
                {m.email && <span><i className="ti ti-mail" style={{ marginRight:5 }}/>{m.email}</span>}
              </div>
              {isAdmin && (
                <div style={{ marginTop:12, display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                  <Btn size="sm" icon="edit" onClick={() => openEdit(m)}>Edit</Btn>
                  <Btn size="sm" danger icon="trash" onClick={() => setDelItem(m)}>Remove</Btn>
                </div>
              )}
            </Card>
          ))}
        </div>

        {selected && (
          <Card style={{ position:'sticky', top:16, alignSelf:'flex-start' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <h3 style={{ fontWeight:700, color:C.text }}>Mentor Profile</h3>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3 }}><i className="ti ti-x" /></button>
            </div>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <Avatar name={selected.full_name} size={72} color={C.accent} />
              <div style={{ fontWeight:700, fontSize:17, color:C.text, marginTop:10 }}>{selected.full_name}</div>
              <div style={{ marginTop:8 }}><Badge label={selected.technical_area||'General'} color="teal" /></div>
            </div>
            {selected.bio && <p style={{ fontSize:14, color:C.text2, lineHeight:1.6, marginBottom:14, fontStyle:'italic' }}>"{selected.bio}"</p>}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[['Phone',selected.phone,'phone'],['Email',selected.email,'mail'],['Status',selected.is_active?'Active':'Inactive','circle-check']].map(([l,v,i]) => v && (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:C.bg3, borderRadius:8 }}>
                  <i className={`ti ti-${i}`} style={{ color:C.text3, fontSize:16, flexShrink:0 }} />
                  <div><div style={{ fontSize:11, color:C.text3, fontWeight:600, textTransform:'uppercase' }}>{l}</div><div style={{ fontSize:13, color:C.text }}>{v}</div></div>
                </div>
              ))}
            </div>
            {isAdmin && (
              <div style={{ display:'flex', gap:8, marginTop:14 }}>
                <Btn variant="outline" icon="edit" onClick={() => openEdit(selected)} size="sm" style={{ flex:1 }}>Edit</Btn>
                <Btn danger icon="trash" onClick={() => setDelItem(selected)} size="sm">Remove</Btn>
              </div>
            )}
          </Card>
        )}
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Technical Mentor' : 'Edit Mentor'} onClose={() => setModal(null)} width={500}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Inp label="Full Name" value={form.full_name} onChange={v => setForm({...form, full_name:v})} placeholder="JOHN DOE" required />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Technical Area</label>
                <select value={form.technical_area} onChange={e => setForm({...form, technical_area:e.target.value})} style={{ width:'100%', padding:'9px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:'inherit' }}>
                  <option value="">Select area…</option>
                  {AREAS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <Inp label="Phone" value={form.phone} onChange={v => setForm({...form, phone:v})} placeholder="254XXXXXXXXX" />
            </div>
            <Inp label="Email" value={form.email} onChange={v => setForm({...form, email:v})} placeholder="mentor@email.com" type="email" />
            <Txt label="Bio / Expertise" value={form.bio} onChange={v => setForm({...form, bio:v})} placeholder="Brief description of expertise and experience…" rows={3} />
          </div>
          <div style={{ marginTop:'1.25rem', display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" icon="device-floppy" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Mentor'}</Btn>
          </div>
        </Modal>
      )}

      {delItem && <Confirm message={`Remove ${delItem.full_name} from mentors? This cannot be undone.`} onConfirm={doDelete} onCancel={() => setDelItem(null)} />}
    </div>
  );
}

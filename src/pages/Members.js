import { useEffect, useState, useCallback } from 'react';
import { supabase, logAudit } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Btn, Inp, Sel, Card, Modal, Confirm, Empty, useToast, sectionColor, C } from '../components/UI';

const SECTIONS = ['TOURISM','ELECTRICAL','FOOD & BEVERAGE','BUILDING & CONSTRUCTION','COSMETOLOGY','PLUMBING','ICT','FASHION','BUSINESS','MECHANICAL','HOSPITALITY','OTHER'];
const STATUS_C = { active:'green', inactive:'gray', suspended:'red' };
const ROLE_C   = { member:'blue', club_officer:'purple', captain:'amber' };
const BLANK    = { full_name:'', section:'', adm_no:'', phone:'', email:'', role:'member', status:'active' };

export default function Members() {
  const { isAdmin, profile } = useAuth();
  const { show, Toasts }     = useToast();
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [fSect,   setFSect]   = useState('');
  const [fStat,   setFStat]   = useState('');
  const [modal,   setModal]   = useState(null); // null | 'add' | {type:'edit',row}
  const [form,    setForm]    = useState(BLANK);
  const [errs,    setErrs]    = useState({});
  const [saving,  setSaving]  = useState(false);
  const [delRow,  setDelRow]  = useState(null);
  const [detail,  setDetail]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('members').select('*').order('full_name');
    if (fSect) q = q.eq('section', fSect);
    if (fStat) q = q.eq('status',  fStat);
    if (search) q = q.or(`full_name.ilike.%${search}%,adm_no.ilike.%${search}%`);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  }, [search, fSect, fStat]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openAdd  = () => { setForm(BLANK); setErrs({}); setModal('add'); };
  const openEdit = r  => { setForm({ full_name:r.full_name, section:r.section, adm_no:r.adm_no, phone:r.phone||'', email:r.email||'', role:r.role, status:r.status }); setErrs({}); setModal({ type:'edit', row:r }); };

  function validate() {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Required';
    if (!form.section)          e.section   = 'Required';
    if (!form.adm_no.trim())    e.adm_no    = 'Required';
    setErrs(e); return !Object.keys(e).length;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, full_name: form.full_name.toUpperCase(), section: form.section.toUpperCase() };
      if (modal === 'add') {
        const { data, error } = await supabase.from('members').insert(payload).select().single();
        if (error) throw error;
        setRows(r => [data, ...r]);
        await logAudit('ADD_MEMBER','members',data.id,profile?.full_name,`Added: ${data.full_name}`);
        show('Member registered successfully');
      } else {
        const { data, error } = await supabase.from('members').update(payload).eq('id',modal.row.id).select().single();
        if (error) throw error;
        setRows(r => r.map(x => x.id===modal.row.id ? data : x));
        if (detail?.id === modal.row.id) setDetail(data);
        await logAudit('EDIT_MEMBER','members',data.id,profile?.full_name,`Edited: ${data.full_name}`);
        show('Member updated');
      }
      setModal(null);
    } catch(ex) { show(ex.message||'Error saving member', 'error'); }
    setSaving(false);
  }

  async function doDelete() {
    const { error } = await supabase.from('members').delete().eq('id', delRow.id);
    if (error) { show(error.message,'error'); }
    else {
      setRows(r => r.filter(x => x.id !== delRow.id));
      if (detail?.id === delRow.id) setDetail(null);
      await logAudit('DELETE_MEMBER','members',delRow.id,profile?.full_name,`Deleted: ${delRow.full_name}`);
      show('Member removed');
    }
    setDelRow(null);
  }

  function exportCSV() {
    const headers = ['Full Name','Section','Admission No.','Phone','Email','Role','Status','Joined'];
    const csvRows = [headers, ...rows.map(m => [m.full_name,m.section,m.adm_no,m.phone,m.email,m.role,m.status,m.joined_at])];
    const csv = csvRows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = 'letvc_members.csv'; a.click();
  }

  return (
    <div>
      <Toasts />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.25rem', gap:10, flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:C.text }}>Members Registry</h2>
          <p style={{ color:C.text3, fontSize:13, marginTop:2 }}>{rows.length} member{rows.length!==1?'s':''} found</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {isAdmin && <Btn icon="download" onClick={exportCSV} size="sm">Export CSV</Btn>}
          {isAdmin && <Btn variant="primary" icon="user-plus" onClick={openAdd}>Register Member</Btn>}
        </div>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom:'1rem', padding:'1rem' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or admission no…" style={{ padding:'8px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit', outline:'none' }} />
          <select value={fSect} onChange={e=>setFSect(e.target.value)} style={{ padding:'8px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit' }}>
            <option value="">All Departments</option>
            {SECTIONS.map(s=><option key={s}>{s}</option>)}
          </select>
          <select value={fStat} onChange={e=>setFStat(e.target.value)} style={{ padding:'8px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, fontFamily:'inherit' }}>
            <option value="">All Statuses</option>
            {['active','inactive','suspended'].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:detail?'1fr 320px':'1fr', gap:16 }}>
        {/* Table */}
        <Card style={{ padding:0, overflow:'hidden' }}>
          {loading ? <div style={{ textAlign:'center', padding:'3rem', color:C.text3 }}>Loading…</div> :
           rows.length===0 ? <Empty icon="users" message="No members found" action={isAdmin&&<Btn variant="primary" icon="user-plus" onClick={openAdd}>Register first member</Btn>} /> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:C.bg3 }}>
                    {['Member','Department','Adm. No.','Contact','Role','Status',isAdmin?'Actions':''].map(h=>(
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m,i) => (
                    <tr key={m.id} style={{ borderTop:`1px solid ${C.border}`, background:detail?.id===m.id?C.primaryBg:'transparent', cursor:'pointer' }} onClick={()=>setDetail(detail?.id===m.id?null:m)}>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <Avatar name={m.full_name} size={34} section={m.section} />
                          <span style={{ fontWeight:600, fontSize:14, color:C.text }}>{m.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:13, color:C.text2 }}>{m.section}</td>
                      <td style={{ padding:'12px 14px', fontSize:12, fontFamily:'monospace', color:C.text3 }}>{m.adm_no}</td>
                      <td style={{ padding:'12px 14px', fontSize:12, color:C.text3 }}>
                        {m.phone && <div><i className="ti ti-phone" style={{ marginRight:3 }}/>{m.phone}</div>}
                        {m.email && <div style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}><i className="ti ti-mail" style={{ marginRight:3 }}/>{m.email}</div>}
                      </td>
                      <td style={{ padding:'12px 14px' }}><Badge label={m.role.replace('_',' ')} color={ROLE_C[m.role]||'blue'}/></td>
                      <td style={{ padding:'12px 14px' }}><Badge label={m.status} color={STATUS_C[m.status]} dot /></td>
                      {isAdmin && (
                        <td style={{ padding:'12px 14px' }} onClick={e=>e.stopPropagation()}>
                          <div style={{ display:'flex', gap:6 }}>
                            <Btn size="sm" icon="edit" onClick={()=>openEdit(m)}>Edit</Btn>
                            <Btn size="sm" danger icon="trash" onClick={()=>setDelRow(m)}>Del</Btn>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Detail panel */}
        {detail && (
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <h3 style={{ fontWeight:700, color:C.text }}>Member Details</h3>
              <button onClick={()=>setDetail(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3 }}><i className="ti ti-x"/></button>
            </div>
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <Avatar name={detail.full_name} size={64} section={detail.section} />
              <div style={{ fontWeight:700, fontSize:17, color:C.text, marginTop:10 }}>{detail.full_name}</div>
              <div style={{ fontSize:13, color:C.text3 }}>{detail.section}</div>
              <div style={{ marginTop:8, display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' }}>
                <Badge label={detail.role.replace('_',' ')} color={ROLE_C[detail.role]||'blue'} />
                <Badge label={detail.status} color={STATUS_C[detail.status]} dot />
              </div>
            </div>
            {[['Admission No.',detail.adm_no,'id-badge'],['Phone',detail.phone,'phone'],['Email',detail.email,'mail'],['Joined',detail.joined_at,'calendar']].map(([lbl,val,ico])=>val&&(
              <div key={lbl} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:C.bg3, borderRadius:8, marginBottom:8 }}>
                <i className={`ti ti-${ico}`} style={{ color:C.text3, fontSize:16, flexShrink:0 }}/>
                <div><div style={{ fontSize:11, color:C.text3, fontWeight:600, textTransform:'uppercase' }}>{lbl}</div><div style={{ fontSize:13, color:C.text }}>{val}</div></div>
              </div>
            ))}
            {isAdmin && (
              <div style={{ display:'flex', gap:8, marginTop:12 }}>
                <Btn variant="outline" icon="edit" onClick={()=>openEdit(detail)} size="sm" style={{ flex:1 }}>Edit</Btn>
                <Btn danger icon="trash" onClick={()=>setDelRow(detail)} size="sm">Remove</Btn>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal==='add'?'Register New Member':'Edit Member'} onClose={()=>setModal(null)} width={560}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Inp label="Full Name" value={form.full_name} onChange={v=>setForm({...form,full_name:v})} placeholder="JOHN KAMAU" required error={errs.full_name} span={2} />
            <Sel label="Department / Section" value={form.section} onChange={v=>setForm({...form,section:v})} required error={errs.section}
              options={[{value:'',label:'Select department…'},...SECTIONS.map(s=>({value:s,label:s}))]} />
            <Inp label="Admission Number" value={form.adm_no} onChange={v=>setForm({...form,adm_no:v})} placeholder="e.g. DICT/M25/001" required error={errs.adm_no} />
            <Inp label="Phone" value={form.phone} onChange={v=>setForm({...form,phone:v})} placeholder="254XXXXXXXXX" />
            <Inp label="Email" value={form.email} onChange={v=>setForm({...form,email:v})} placeholder="email@example.com" type="email" />
            <Sel label="Role" value={form.role} onChange={v=>setForm({...form,role:v})}
              options={['member','club_officer','captain']} />
            <Sel label="Status" value={form.status} onChange={v=>setForm({...form,status:v})}
              options={['active','inactive','suspended']} />
          </div>
          <div style={{ marginTop:'1.25rem', display:'flex', gap:10, justifyContent:'flex-end' }}>
            <Btn onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="primary" icon="device-floppy" onClick={save} disabled={saving}>{saving?'Saving…':'Save Member'}</Btn>
          </div>
        </Modal>
      )}

      {delRow && <Confirm message={`Remove ${delRow.full_name} from the club registry? This cannot be undone.`} onConfirm={doDelete} onCancel={()=>setDelRow(null)} />}
    </div>
  );
}

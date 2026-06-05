import { useState } from 'react';

/* ── Design tokens ─────────────────────────────────────────────── */
export const C = {
  bg:'#0f1117', bg2:'#1a1d27', bg3:'#22263a',
  surface:'#1e2235', surface2:'#252a3d',
  border:'#2e3347', border2:'#3a3f58',
  text:'#e8eaf0', text2:'#9aa0b8', text3:'#5f6680',
  primary:'#6c63ff', primary2:'#8b84ff', primaryBg:'rgba(108,99,255,0.12)',
  accent:'#00d9a3', accentBg:'rgba(0,217,163,0.12)',
  warn:'#ffa940', warnBg:'rgba(255,169,64,0.12)',
  danger:'#ff6b6b', dangerBg:'rgba(255,107,107,0.12)',
  success:'#52c41a', successBg:'rgba(82,196,26,0.12)',
};

const SECTION_PALETTE = {
  'TOURISM':'#0ea5e9','ELECTRICAL':'#6c63ff','FOOD & BEVERAGE':'#f59e0b',
  'BUILDING & CONSTRUCTION':'#22c55e','COSMETOLOGY':'#ec4899',
  'PLUMBING':'#a78bfa','ICT':'#ef4444','FASHION':'#f97316',
  'BUSINESS':'#14b8a6','ROBOTICS':'#8b5cf6','MECHANICAL':'#64748b',
  'HOSPITALITY':'#06b6d4','BUILDING':'#84cc16',
};
export const sectionColor = s => SECTION_PALETTE[s] || C.primary;

export const initials = name =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

/* ── Avatar ─────────────────────────────────────────────────────── */
export function Avatar({ name, size = 36, section, color, url }) {
  const bg = url ? 'transparent' : (color || (section ? sectionColor(section) : C.primary));
  return url
    ? <img src={url} alt={name} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
    : (
      <div style={{ width:size, height:size, minWidth:size, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:size*0.36, fontWeight:700, flexShrink:0, letterSpacing:'-0.5px' }}>
        {initials(name)}
      </div>
    );
}

/* ── Badge ──────────────────────────────────────────────────────── */
const BADGE = {
  blue:[C.primaryBg,C.primary2], green:[C.successBg,C.success],
  amber:[C.warnBg,C.warn], red:[C.dangerBg,C.danger],
  teal:[C.accentBg,C.accent], purple:[C.primaryBg,C.primary2],
  gray:['rgba(255,255,255,0.08)',C.text2],
};
export function Badge({ label, color='blue', dot }) {
  const [bg, fg] = BADGE[color] || BADGE.blue;
  return (
    <span style={{ background:bg, color:fg, fontSize:11, padding:'2px 9px', borderRadius:99, fontWeight:600, whiteSpace:'nowrap', display:'inline-flex', alignItems:'center', gap:4 }}>
      {dot && <span style={{ width:6, height:6, borderRadius:'50%', background:fg }} />}
      {label}
    </span>
  );
}

/* ── Button ─────────────────────────────────────────────────────── */
export function Btn({ children, variant='ghost', onClick, disabled, icon, danger, size, style:ex, type='button' }) {
  const base = { display:'inline-flex', alignItems:'center', gap:6, border:'1px solid transparent', borderRadius:8, cursor:disabled?'not-allowed':'pointer', fontFamily:'inherit', fontWeight:500, opacity:disabled?0.45:1, transition:'all 0.15s', fontSize:size==='sm'?12:14, padding:size==='sm'?'4px 11px':'7px 16px', whiteSpace:'nowrap', ...ex };
  const styles = {
    primary:{ background:C.primary, color:'#fff', borderColor:C.primary },
    accent: { background:C.accent,  color:'#0f1117' },
    ghost:  { background:C.surface2, color:C.text2,  borderColor:C.border },
    danger: { background:C.dangerBg, color:C.danger, borderColor:C.danger },
    outline:{ background:'transparent', color:C.primary2, borderColor:C.primary },
  };
  return <button type={type} style={{ ...base, ...(styles[danger?'danger':variant]||styles.ghost) }} onClick={onClick} disabled={disabled}>{icon&&<i className={`ti ti-${icon}`} style={{ fontSize:16 }}/>}{children}</button>;
}

/* ── Input / Select / Textarea ──────────────────────────────────── */
export function Field({ label, error, children, required, span }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, gridColumn:span?`span ${span}`:undefined }}>
      {label && <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}{required&&<span style={{ color:C.danger }}> *</span>}</label>}
      {children}
      {error && <span style={{ fontSize:12, color:C.danger }}>{error}</span>}
    </div>
  );
}

const inputStyle = (err) => ({ width:'100%', padding:'9px 12px', background:C.bg3, border:`1px solid ${err?C.danger:C.border}`, borderRadius:8, color:C.text, fontSize:14, outline:'none', fontFamily:'inherit', transition:'border-color 0.15s' });

export function Inp({ label, value, onChange, placeholder, type='text', error, disabled, required, span }) {
  return (
    <Field label={label} error={error} required={required} span={span}>
      <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={inputStyle(error)} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=error?C.danger:C.border} />
    </Field>
  );
}
export function Sel({ label, value, onChange, options, error, disabled, required, span }) {
  return (
    <Field label={label} error={error} required={required} span={span}>
      <select value={value||''} onChange={e=>onChange(e.target.value)} disabled={disabled} style={{ ...inputStyle(error), appearance:'none' }}>
        {options.map(o => typeof o==='string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}
export function Txt({ label, value, onChange, placeholder, rows=3, error, disabled, required, span }) {
  return (
    <Field label={label} error={error} required={required} span={span}>
      <textarea value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled} style={{ ...inputStyle(error), resize:'vertical' }} />
    </Field>
  );
}

/* ── Card ────────────────────────────────────────────────────────── */
export function Card({ children, style:ex, onClick, highlight }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ background:C.surface, border:`1px solid ${(hov&&onClick)||highlight?C.primary:C.border}`, borderRadius:12, padding:'1.25rem', cursor:onClick?'pointer':'default', transition:'border-color 0.15s, box-shadow 0.15s', boxShadow:hov&&onClick?`0 0 0 1px ${C.primary},0 4px 20px rgba(0,0,0,0.4)`:'none', ...ex }}
         onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {children}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────── */
export function Modal({ title, onClose, children, width=540 }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem', backdropFilter:'blur(4px)' }}>
      <div style={{ background:C.bg2, border:`1px solid ${C.border2}`, borderRadius:14, width:'100%', maxWidth:width, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 80px rgba(0,0,0,0.6)', animation:'fadeIn 0.2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1.25rem 1.5rem', borderBottom:`1px solid ${C.border}` }}>
          <h3 style={{ fontWeight:700, fontSize:16, color:C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3, fontSize:20, padding:2, lineHeight:1 }}>
            <i className="ti ti-x"/>
          </button>
        </div>
        <div style={{ padding:'1.5rem' }}>{children}</div>
      </div>
    </div>
  );
}

/* ── ProgressBar ─────────────────────────────────────────────────── */
export function ProgressBar({ value, color }) {
  const c = color || (value>=70?C.success:value>=40?C.warn:C.primary);
  return (
    <div style={{ height:6, background:C.bg3, borderRadius:99, overflow:'hidden' }}>
      <div style={{ width:`${Math.min(value,100)}%`, height:'100%', background:c, borderRadius:99, transition:'width 0.4s ease' }}/>
    </div>
  );
}

/* ── StatCard ────────────────────────────────────────────────────── */
export function StatCard({ icon, label, value, color, sub }) {
  const c = color||C.primary;
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:48, height:48, borderRadius:12, background:`${c}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <i className={`ti ti-${icon}`} style={{ fontSize:24, color:c }}/>
        </div>
        <div>
          <div style={{ fontSize:28, fontWeight:800, color:C.text, lineHeight:1.1 }}>{value}</div>
          <div style={{ fontSize:13, color:C.text2, marginTop:2 }}>{label}</div>
          {sub && <div style={{ fontSize:12, color:c, marginTop:1 }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

/* ── Confirm ─────────────────────────────────────────────────────── */
export function Confirm({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirm Action" onClose={onCancel} width={380}>
      <p style={{ fontSize:15, color:C.text2, lineHeight:1.6, marginBottom:'1.5rem' }}>{message}</p>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn danger onClick={onConfirm} icon="trash">Delete</Btn>
      </div>
    </Modal>
  );
}

/* ── EmptyState ──────────────────────────────────────────────────── */
export function Empty({ icon, message, action }) {
  return (
    <div style={{ textAlign:'center', padding:'3rem 1rem' }}>
      <i className={`ti ti-${icon}`} style={{ fontSize:52, color:C.border2, display:'block', marginBottom:12 }}/>
      <p style={{ color:C.text2, fontSize:15, marginBottom:action?16:0 }}>{message}</p>
      {action}
    </div>
  );
}

/* ── Toast hook ──────────────────────────────────────────────────── */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (msg, type='success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  const Toasts = () => (
    <div style={{ position:'fixed', bottom:24, right:24, display:'flex', flexDirection:'column', gap:8, zIndex:9999 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background:t.type==='error'?C.danger:t.type==='warning'?C.warn:C.success, color:'#fff', padding:'10px 16px', borderRadius:10, fontSize:13, fontWeight:500, minWidth:220, boxShadow:'0 4px 16px rgba(0,0,0,0.4)', display:'flex', alignItems:'center', gap:8, animation:'fadeIn 0.2s ease' }}>
          <i className={`ti ti-${t.type==='error'?'alert-circle':t.type==='warning'?'alert-triangle':'circle-check'}`}/>
          {t.msg}
        </div>
      ))}
    </div>
  );
  return { show, Toasts };
}

/* ── Global CSS injected once ────────────────────────────────────── */
const css = `
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin 0.8s linear infinite;display:inline-block}
`;
if (!document.getElementById('ui-css')) {
  const s = document.createElement('style'); s.id='ui-css'; s.textContent=css; document.head.appendChild(s);
}

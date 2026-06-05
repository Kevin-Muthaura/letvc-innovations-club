import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { C, Btn } from '../components/UI';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode]   = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [pass,  setPass]  = useState('');
  const [name,  setName]  = useState('');
  const [dept,  setDept]  = useState('');
  const [adm,   setAdm]   = useState('');
  const [phone, setPhone] = useState('');
  const [showP, setShowP] = useState(false);
  const [err,   setErr]   = useState('');
  const [ok,    setOk]    = useState('');
  const [busy,  setBusy]  = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, pass);
      } else {
        await signUp(email, pass, { full_name:name, section:dept, adm_no:adm||null, phone });
        setOk('Account created! Check your email to confirm, then log in.');
        setMode('login');
      }
    } catch (ex) { setErr(ex.message || 'Something went wrong'); }
    setBusy(false);
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:`linear-gradient(135deg,${C.bg} 0%,#12163a 50%,#0a2a1e 100%)`, padding:'1rem' }}>
      <div style={{ background:C.bg2, border:`1px solid ${C.border2}`, borderRadius:16, padding:'2.5rem', width:'100%', maxWidth:420, boxShadow:'0 24px 80px rgba(0,0,0,0.5)' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ width:64, height:64, borderRadius:18, background:C.primaryBg, border:`1px solid ${C.primary}40`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
            <i className="ti ti-bulb" style={{ fontSize:32, color:C.primary2 }}/>
          </div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>LETVC Innovations Club</h1>
          <p style={{ fontSize:13, color:C.text3 }}>Laikipia East Technical & Vocational College</p>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:C.bg3, borderRadius:8, padding:4, marginBottom:'1.5rem' }}>
          {['login','signup'].map(m => (
            <button key={m} onClick={()=>{ setMode(m); setErr(''); setOk(''); }} style={{ flex:1, padding:'7px', borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', background:mode===m?C.surface:'transparent', color:mode===m?C.text:C.text3, transition:'all 0.15s' }}>
              {m==='login'?'Sign In':'Register'}
            </button>
          ))}
        </div>

        {err && <div style={{ background:C.dangerBg, border:`1px solid ${C.danger}40`, color:C.danger, borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:'1rem', display:'flex', gap:8 }}><i className="ti ti-alert-circle"/>{err}</div>}
        {ok  && <div style={{ background:C.successBg, border:`1px solid ${C.success}40`, color:C.success, borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:'1rem', display:'flex', gap:8 }}><i className="ti ti-circle-check"/>{ok}</div>}

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {mode==='signup' && <>
            <Lbl>Full Name *</Lbl>
            <Ipt value={name} onChange={setName} placeholder="Your full name" required />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><Lbl>Department</Lbl><Ipt value={dept} onChange={setDept} placeholder="e.g. ICT" /></div>
              <div><Lbl>Admission No.</Lbl><Ipt value={adm} onChange={setAdm} placeholder="e.g. DICT/M25/001" /></div>
            </div>
            <Lbl>Phone</Lbl>
            <Ipt value={phone} onChange={setPhone} placeholder="254XXXXXXXXX" type="tel" />
          </>}

          <Lbl>Email Address *</Lbl>
          <Ipt value={email} onChange={setEmail} placeholder="you@email.com" type="email" required />

          <Lbl>Password *</Lbl>
          <div style={{ position:'relative' }}>
            <Ipt value={pass} onChange={setPass} placeholder={mode==='signup'?'Min 6 characters':'Your password'} type={showP?'text':'password'} required />
            <button type="button" onClick={()=>setShowP(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.text3 }}>
              <i className={`ti ti-eye${showP?'-off':''}`} style={{ fontSize:17 }}/>
            </button>
          </div>

          <button type="submit" disabled={busy} style={{ padding:'11px', background:C.primary, color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:700, cursor:busy?'not-allowed':'pointer', opacity:busy?0.6:1, marginTop:4, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {busy && <i className="ti ti-loader-2 spin" style={{ fontSize:18 }}/>}
            {mode==='login'?'Sign In':'Create Account'}
          </button>
        </form>

        {mode==='login' && (
          <div style={{ marginTop:'1.5rem', padding:'1rem', background:C.bg3, borderRadius:8, fontSize:12, color:C.text3, borderLeft:`3px solid ${C.primary}` }}>
            <strong style={{ color:C.text2 }}>Admin login:</strong> Use the credentials created in Supabase Auth → Users after you run the setup. Your first account should be set to role <code style={{ background:C.border, padding:'1px 5px', borderRadius:4 }}>admin</code> in the profiles table.
          </div>
        )}
      </div>
    </div>
  );
}

function Lbl({ children }) {
  return <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:-8 }}>{children}</label>;
}
function Ipt({ value, onChange, placeholder, type='text', required }) {
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} style={{ width:'100%', padding:'9px 12px', background:C.bg3, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:14, fontFamily:'inherit', outline:'none' }} />;
}

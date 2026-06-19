import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { C } from '../components/UI';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode,  setMode]  = useState('login');
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
      if (mode === 'login') { await signIn(email, pass); }
      else {
        await signUp(email, pass, { full_name:name, section:dept, adm_no:adm||null, phone });
        setOk('Account created! Check your email if confirmation is required, then log in.');
        setMode('login');
      }
    } catch (ex) { setErr(ex.message || 'Something went wrong'); }
    setBusy(false);
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:`linear-gradient(135deg,${C.bg} 0%,#12163a 50%,#0a2a1e 100%)`, padding:'1rem' }}>
      <div style={{ background:C.bg2, border:`1px solid ${C.border2}`, borderRadius:16, padding:'2.5rem', width:'100%', maxWidth:420, boxShadow:'0 24px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ width:64, height:64, borderRadius:18, background:C.primaryBg, border:`1px solid ${C.primary}40`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
            <i className="ti ti-bulb" style={{ fontSize:32, color:C.primary2 }}/>
          </div>
          <h1 style={{ fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>LETVC Innovations Club</h1>
          <p style={{ fontSize:13, color:C.text3 }}>Laikipia East Technical & Vocational College</p>
        </div>

        <div style={{ display:'flex', background:C.bg3, borderRadius:8, padding:4, marginBottom:'1.5rem' }}>
          {['login','signup'].map(m=>(
            <button key={m} onClick={()=>{ setMode(m); setErr(''); setOk(''); }} style={{ flex:1, padding:'7px', borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', background:mode===m?C.surface:'transparent', color:mode===m?C.text:C.text3, transition:'all 0.15s' }}>
              {m==='login'?'Sign In':'Register'}
            </button>
          ))}
        </div>

        {err && <div style={{ background:C.dangerBg, border:`1px solid ${C.danger}40`, color:C.danger, borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:'1rem', display:'flex', gap:8 }}><i className="ti ti-alert-circle"/>{err}</div>}
        {ok  && <div style={{ background:C.successBg, border:`1px solid ${C.success}40`, color:C.success, borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:'1rem', display:'flex', gap:8 }}><i className="ti ti-circle-check"/>{ok}</div>}

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {mode==='signup' && <>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Full Name *</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" required style={iStyle}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={lStyle}>Department</label>
                <input value={dept} onChange={e=>setDept(e.target.value)} placeholder="e.g. ICT" style={iStyle}/>
              </div>
              <div>
                <label style={lStyle}>Admission No.</label>
                <input value={adm} onChange={e=>setAdm(e.target.value)} placeholder="e.g. DICT/M25/001" style={iStyle}/>
              </div>
            </div>
            <div>
              <label style={lStyle}>Phone</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="254XXXXXXXXX" type="tel" style={iStyle}/>
            </div>
          </>}

          <div>
            <label style={lStyle}>Email Address *</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com" type="email" required style={iStyle}/>
          </div>

          <div>
            <label style={lStyle}>Password *</label>
            <div style={{ position:'relative' }}>
              <input value={pass} onChange={e=>setPass(e.target.value)} placeholder={mode==='signup'?'Min 6 characters':'Your password'} type={showP?'text':'password'} required style={{ ...iStyle, paddingRight:40 }}/>
              <button type="button" onClick={()=>setShowP(p=>!p)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:C.text3 }}>
                <i className={`ti ti-eye${showP?'-off':''}`} style={{ fontSize:17 }}/>
              </button>
            </div>
          </div>

          <button type="submit" disabled={busy} style={{ padding:'11px', background:C.primary, color:'#fff', border:'none', borderRadius:8, fontSize:15, fontWeight:700, cursor:busy?'not-allowed':'pointer', opacity:busy?0.6:1, marginTop:4, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {busy && <i className="ti ti-loader-2 spin" style={{ fontSize:18 }}/>}
            {mode==='login'?'Sign In':'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const iStyle = { width:'100%', padding:'9px 12px', background:'#22263a', border:'1px solid #2e3347', borderRadius:8, color:'#e8eaf0', fontSize:14, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
const lStyle = { fontSize:11, fontWeight:700, color:'#5f6680', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 };

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiLoader, FiRefreshCw } from 'react-icons/fi';
import { authApi } from '../../services/api';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status,  setStatus]  = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');
  const [code,    setCode]    = useState('');
  const [email,   setEmail]   = useState('');
  const [resending, setResending] = useState(false);
  const [resent,    setResent]    = useState(false);

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token found in URL.'); return; }
    authApi.verifyEmail(token)
      .then(res => { setStatus('success'); setMessage(res.message || 'Email verified successfully!'); })
      .catch(err => {
        const d = err.response?.data || {};
        setStatus('error');
        setCode(d.code || '');
        setMessage(d.message || 'Verification failed. The link may be invalid or expired.');
      });
  }, [token]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await authApi.resendVerification({ email });
      setResent(true);
    } catch { setResent(true); }
    finally { setResending(false); }
  };

  const bg = { minHeight:'100vh', background:'#060e1c', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:"'Inter',system-ui,sans-serif" };
  const card = { maxWidth:'460px', width:'100%', background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'20px', padding:'40px 36px', textAlign:'center' };

  if (status === 'loading') return (
    <div style={bg}><div style={card}>
      <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'rgba(245,158,11,.1)', border:'2px solid rgba(245,158,11,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
        <div style={{ width:'24px', height:'24px', border:'3px solid rgba(245,158,11,.3)', borderTopColor:'#f59e0b', borderRadius:'50%', animation:'kn-spin .7s linear infinite' }}/>
      </div>
      <h2 style={{ color:'#f1f5f9', fontWeight:900, fontSize:'20px', margin:'0 0 8px' }}>Verifying Email…</h2>
      <p style={{ color:'rgba(255,255,255,.4)', fontSize:'13px', margin:0 }}>Please wait a moment.</p>
      <style>{`@keyframes kn-spin{to{transform:rotate(360deg)}}`}</style>
    </div></div>
  );

  if (status === 'success') return (
    <div style={bg}><div style={card}>
      <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'rgba(34,197,94,.15)', border:'2px solid rgba(34,197,94,.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
        <FiCheckCircle size={30} style={{ color:'#4ade80' }}/>
      </div>
      <h2 style={{ color:'#f1f5f9', fontWeight:900, fontSize:'22px', margin:'0 0 10px' }}>Email Verified! 🎉</h2>
      <p style={{ color:'rgba(255,255,255,.55)', fontSize:'14px', lineHeight:1.65, margin:'0 0 28px' }}>
        {message}<br/>Your account is now active and ready to use.
      </p>
      <Link to="/login" style={{ display:'block', padding:'13px', borderRadius:'11px', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#060e1c', fontWeight:800, fontSize:'14px', textDecoration:'none' }}>
        ✓ Sign In to KhanNetra
      </Link>
    </div></div>
  );

  // Error state
  const isExpired   = code === 'TOKEN_EXPIRED';
  const isUsed      = code === 'ALREADY_VERIFIED';
  const isInvalid   = code === 'INVALID_TOKEN';

  return (
    <div style={bg}><div style={card}>
      <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'rgba(239,68,68,.12)', border:'2px solid rgba(239,68,68,.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
        <FiXCircle size={30} style={{ color:'#f87171' }}/>
      </div>
      <h2 style={{ color:'#f1f5f9', fontWeight:900, fontSize:'22px', margin:'0 0 10px' }}>
        {isExpired ? 'Link Expired' : isUsed ? 'Already Verified' : 'Invalid Link'}
      </h2>
      <p style={{ color:'rgba(255,255,255,.55)', fontSize:'14px', lineHeight:1.65, margin:'0 0 24px' }}>{message}</p>

      {isUsed ? (
        <Link to="/login" style={{ display:'block', padding:'12px', borderRadius:'11px', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#060e1c', fontWeight:800, fontSize:'14px', textDecoration:'none' }}>
          Go to Sign In
        </Link>
      ) : isExpired ? (
        resent ? (
          <p style={{ color:'#4ade80', fontSize:'13px' }}>✓ New verification email sent — check your inbox.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div>
              <label style={{ display:'block', color:'rgba(255,255,255,.38)', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' }}>Enter your email to resend</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com"
                style={{ width:'100%', padding:'10px 12px', borderRadius:'10px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.15)', color:'#f1f5f9', fontSize:'13px', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}/>
            </div>
            <button onClick={handleResend} disabled={resending || !email}
              style={{ padding:'11px', borderRadius:'10px', background:'rgba(245,158,11,.15)', border:'1px solid rgba(245,158,11,.35)', color:'#fbbf24', fontWeight:700, fontSize:'13px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              <FiRefreshCw size={14} style={{ animation: resending ? 'kn-spin .8s linear infinite' : 'none' }}/>
              {resending ? 'Sending…' : 'Resend Verification Email'}
            </button>
            <Link to="/login" style={{ color:'rgba(255,255,255,.4)', fontSize:'12px', textDecoration:'none' }}>Back to Sign In</Link>
          </div>
        )
      ) : (
        <Link to="/register" style={{ display:'block', padding:'12px', borderRadius:'11px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)', fontWeight:700, fontSize:'14px', textDecoration:'none' }}>
          Register Again
        </Link>
      )}
      <style>{`@keyframes kn-spin{to{transform:rotate(360deg)}}`}</style>
    </div></div>
  );
}

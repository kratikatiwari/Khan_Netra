import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiEye, FiEyeOff, FiMail, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'mine_manager',        label: 'Mine Manager'         },
  { value: 'inspector',           label: 'Inspector (DGMS)'     },
  { value: 'safety_officer',      label: 'Safety Officer'       },
  { value: 'environment_officer', label: 'Environment Officer'  },
  { value: 'government_officer',  label: 'Government Officer'   },
];

/* Gmail-only regex — must end with @gmail.com */
const GMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;
const validateGmail = (value) => {
  if (!value || !value.trim()) return 'Gmail address is required.';
  if (!GMAIL_REGEX.test(value.trim())) return 'Please enter a valid Gmail address (example@gmail.com).';
  return true;
};

/* ── Post-register "check your email" screen ── */
function VerificationSent({ email, devToken, onResend, resending }) {
  return (
    <div style={{ minHeight:'100vh', background:'#060e1c', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ maxWidth:'480px', width:'100%', background:'rgba(255,255,255,.045)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'20px', padding:'40px 36px', textAlign:'center' }}>
        <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'rgba(34,197,94,.15)', border:'2px solid rgba(34,197,94,.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <FiMail size={28} style={{ color:'#4ade80' }}/>
        </div>
        <h2 style={{ color:'#f1f5f9', fontWeight:900, fontSize:'22px', margin:'0 0 8px' }}>Check Your Email</h2>
        <p style={{ color:'rgba(255,255,255,.55)', fontSize:'14px', margin:'0 0 20px', lineHeight:1.65 }}>
          We sent a verification link to<br/>
          <strong style={{ color:'#fbbf24' }}>{email}</strong>
        </p>
        <div style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.25)', borderRadius:'12px', padding:'14px 16px', marginBottom:'20px', textAlign:'left' }}>
          <p style={{ color:'rgba(255,255,255,.6)', fontSize:'13px', margin:0, lineHeight:1.6 }}>
            📌 <strong style={{ color:'#f1f5f9' }}>Steps:</strong><br/>
            1. Open your Gmail inbox<br/>
            2. Look for an email from <em>KhanNetra DGMS</em><br/>
            3. Click the <strong style={{ color:'#fbbf24' }}>Verify My Email Address</strong> button<br/>
            4. Come back here and Sign In
          </p>
        </div>
        {/* Dev mode: show verify URL when SMTP not configured */}
        {devToken && (
          <div style={{ background:'rgba(245,158,11,.08)', border:'1px solid rgba(245,158,11,.3)', borderRadius:'12px', padding:'14px 16px', marginBottom:'20px', textAlign:'left' }}>
            <p style={{ color:'#fbbf24', fontWeight:700, fontSize:'11px', textTransform:'uppercase', margin:'0 0 6px' }}>⚠️ Dev Mode — SMTP not configured</p>
            <p style={{ color:'rgba(255,255,255,.5)', fontSize:'12px', margin:'0 0 8px' }}>Click below to verify instantly (dev only):</p>
            <a
              href={devToken}
              style={{ display:'block', padding:'8px 12px', background:'rgba(245,158,11,.15)', border:'1px solid rgba(245,158,11,.3)', borderRadius:'8px', color:'#fbbf24', textDecoration:'none', fontSize:'12px', fontWeight:700, wordBreak:'break-all' }}
            >
              ✓ Verify Email (Dev Shortcut)
            </a>
          </div>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          <button onClick={onResend} disabled={resending}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'11px', borderRadius:'10px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)', fontWeight:600, fontSize:'13px', cursor:'pointer', fontFamily:'inherit', opacity: resending ? 0.6 : 1 }}>
            <FiRefreshCw size={14} style={{ animation: resending ? 'kn-spin .8s linear infinite' : 'none' }}/>
            {resending ? 'Sending…' : 'Resend Verification Email'}
          </button>
          <Link to="/login" style={{ display:'block', padding:'11px', borderRadius:'10px', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#060e1c', textDecoration:'none', fontWeight:800, fontSize:'14px' }}>
            Go to Sign In
          </Link>
        </div>
        <p style={{ color:'rgba(255,255,255,.2)', fontSize:'11px', marginTop:'20px' }}>
          Link expires in 24 hours · Check spam folder if not in inbox
        </p>
      </div>
      <style>{`@keyframes kn-spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Main register component ── */
export default function Register() {
  const navigate  = useNavigate();
  const [showPwd, setShowPwd]   = useState(false);
  const [showCPwd, setShowCPwd] = useState(false);
  const [sent,    setSent]      = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [devToken,  setDevToken]  = useState(null);
  const [resending, setResending] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const passwordValue = watch('password', '');

  const onSubmit = async (data) => {
    // Normalise email before sending
    data.email = (data.email || '').toLowerCase().trim();
    try {
      const res = await authApi.register(data);
      if (res.success) {
        setSentEmail(data.email);
        setDevToken(res.data?.dev_verify_url || null);
        setSent(true);
        toast.success(res.message || 'Verification email sent!');
      }
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message;
      if (status === 429) {
        toast.error('Too many attempts. Please wait 15 minutes and try again.', { duration: 6000 });
      } else if (status === 409) {
        toast.error(msg || 'This Gmail address is already registered. Please Sign In.');
      } else if (status === 400) {
        toast.error(msg || 'Please check your details and try again.');
      } else {
        toast.error(msg || 'Registration failed. Please check your connection and try again.');
      }
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await authApi.resendVerification({ email: sentEmail });
      toast.success(res.message || 'Verification email resent!');
      if (res.data?.dev_verify_url) setDevToken(res.data.dev_verify_url);
    } catch {
      toast.error('Could not resend. Please try again.');
    } finally { setResending(false); }
  };

  if (sent) return <VerificationSent email={sentEmail} devToken={devToken} onResend={handleResend} resending={resending}/>;

  return (
    <div style={{ minHeight:'100vh', background:'#060e1c', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <div style={{ width:'100%', maxWidth:'500px' }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', justifyContent:'center', marginBottom:'28px' }}>
          <img src="/khannetra-logo.svg" alt="KhanNetra" style={{ width:'44px', height:'44px', filter:'drop-shadow(0 0 10px rgba(245,158,11,.5))' }}
            onError={e => { e.currentTarget.style.display='none'; }}/>
          <div>
            <p style={{ color:'#f1f5f9', fontWeight:900, fontSize:'20px', margin:0, lineHeight:1 }}>KhanNetra</p>
            <p style={{ color:'rgba(255,255,255,.4)', fontSize:'11px', margin:'2px 0 0' }}>DGMS · Ministry of Coal</p>
          </div>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'20px', padding:'36px 32px', backdropFilter:'blur(20px)' }}>
          <h2 style={{ color:'#f1f5f9', fontWeight:900, fontSize:'22px', margin:'0 0 4px' }}>Create Account</h2>
          <p style={{ color:'rgba(255,255,255,.38)', fontSize:'13px', margin:'0 0 24px' }}>Register for KhanNetra DGMS access</p>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>

              {/* Full Name */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Full Name *</label>
                <input {...register('full_name', { required:'Full name is required' })}
                  placeholder="Dr. Rajesh Kumar" style={inp(!!errors.full_name)}
                  onFocus={focusAmber} onBlur={blurInp(!!errors.full_name)}/>
                {errors.full_name && <p style={errStyle}>{errors.full_name.message}</p>}
              </div>

              {/* Email */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Gmail Address *</label>
                <input {...register('email', { validate: validateGmail })}
                  type="email" placeholder="yourname@gmail.com" style={inp(!!errors.email)}
                  onFocus={focusAmber} onBlur={blurInp(!!errors.email)}/>
                {errors.email && <p style={errStyle}>{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div style={{ position:'relative' }}>
                <label style={labelStyle}>Password *</label>
                <div style={{ position:'relative' }}>
                  <input {...register('password', { required:'Password required', minLength:{ value:8, message:'Minimum 8 characters' } })}
                    type={showPwd ? 'text' : 'password'} placeholder="Min 8 characters"
                    style={{ ...inp(!!errors.password), paddingRight:'40px' }}
                    onFocus={focusAmber} onBlur={blurInp(!!errors.password)}/>
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', padding:0 }}>
                    {showPwd ? <FiEyeOff size={15}/> : <FiEye size={15}/>}
                  </button>
                </div>
                {errors.password && <p style={errStyle}>{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div style={{ position:'relative' }}>
                <label style={labelStyle}>Confirm Password *</label>
                <div style={{ position:'relative' }}>
                  <input {...register('confirm_password', {
                    required:'Please confirm your password',
                    validate: v => v === passwordValue || 'Passwords do not match',
                  })}
                    type={showCPwd ? 'text' : 'password'} placeholder="Repeat password"
                    style={{ ...inp(!!errors.confirm_password), paddingRight:'40px' }}
                    onFocus={focusAmber} onBlur={blurInp(!!errors.confirm_password)}/>
                  <button type="button" onClick={() => setShowCPwd(v => !v)}
                    style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', padding:0 }}>
                    {showCPwd ? <FiEyeOff size={15}/> : <FiEye size={15}/>}
                  </button>
                </div>
                {errors.confirm_password && <p style={errStyle}>{errors.confirm_password.message}</p>}
              </div>

              {/* Role */}
              <div>
                <label style={labelStyle}>Role *</label>
                <select {...register('role', { required:'Please select a role' })} style={inp(!!errors.role)}>
                  <option value="">Select Role</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {errors.role && <p style={errStyle}>{errors.role.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle}>Phone</label>
                <input {...register('phone')} placeholder="+91-9876543210" style={inp(false)}
                  onFocus={focusAmber} onBlur={blurInp(false)}/>
              </div>

              {/* Designation */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Designation</label>
                <input {...register('designation')} placeholder="Inspector of Mines" style={inp(false)}
                  onFocus={focusAmber} onBlur={blurInp(false)}/>
              </div>

              {/* Department */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={labelStyle}>Department / Organization</label>
                <input {...register('department')} placeholder="DGMS, Ministry of Coal" style={inp(false)}
                  onFocus={focusAmber} onBlur={blurInp(false)}/>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting}
              style={{ width:'100%', marginTop:'20px', padding:'13px', borderRadius:'11px', fontWeight:800, fontSize:'14px', border:'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', background: isSubmitting ? 'rgba(245,158,11,.45)' : 'linear-gradient(135deg,#f59e0b,#d97706)', color:'#060e1c', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
              {isSubmitting ? (
                <><span style={{ width:'15px', height:'15px', border:'2px solid rgba(6,14,28,.3)', borderTopColor:'#060e1c', borderRadius:'50%', display:'inline-block', animation:'kn-spin .7s linear infinite' }}/> Creating Account…</>
              ) : (
                <><FiCheckCircle size={16}/> Create Account &amp; Send Verification Email</>
              )}
            </button>

            <p style={{ textAlign:'center', marginTop:'14px', fontSize:'13px', color:'rgba(255,255,255,.35)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color:'#f59e0b', fontWeight:700, textDecoration:'none' }}>Sign In</Link>
            </p>
          </form>
        </div>
      </div>
      <style>{`@keyframes kn-spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── style helpers ── */
const labelStyle = { display:'block', color:'rgba(255,255,255,.38)', fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' };
const errStyle   = { color:'#f87171', fontSize:'11px', marginTop:'4px' };
const inp = (hasErr) => ({
  width:'100%', display:'block', padding:'10px 12px', borderRadius:'10px', fontFamily:'inherit',
  background:'rgba(255,255,255,.06)', border:`1px solid ${hasErr ? '#ef4444' : 'rgba(255,255,255,.13)'}`,
  color:'#f1f5f9', fontSize:'13px', outline:'none', transition:'border-color .2s, box-shadow .2s', boxSizing:'border-box',
});
const focusAmber = e => { e.target.style.borderColor='rgba(245,158,11,.55)'; e.target.style.boxShadow='0 0 0 3px rgba(245,158,11,.1)'; };
const blurInp = (hasErr) => e => { e.target.style.borderColor=hasErr?'#ef4444':'rgba(255,255,255,.13)'; e.target.style.boxShadow='none'; };

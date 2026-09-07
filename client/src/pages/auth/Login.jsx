import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiEye, FiEyeOff, FiShield, FiUser, FiLock, FiZap } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const DEMOS = [
  { role: 'Admin',          email: 'admin@khannetra.gov.in',       label: 'DGMS Director' },
  { role: 'Govt Officer',   email: 'officer1@khannetra.gov.in',    label: 'Joint Secretary' },
  { role: 'Mine Manager',   email: 'manager1@khannetra.gov.in',    label: 'Jharia Mine' },
  { role: 'Inspector',      email: 'inspector1@khannetra.gov.in',  label: 'DGMS Region-2' },
  { role: 'Safety Officer', email: 'safety1@khannetra.gov.in',     label: 'Safety Dept.' },
  { role: 'Env Officer',    email: 'env1@khannetra.gov.in',        label: 'CPCB Officer' },
];

const STATS = [
  { value: '6+',      label: 'Mines Monitored'     },
  { value: 'AI',      label: 'Risk Prediction'      },
  { value: 'Live',    label: 'Environmental Data'   },
  { value: 'DGMS',    label: 'Regulatory Aligned'   },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPwd, setShowPwd] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    const result = await login(data);
    if (result.success) { toast.success('Welcome back!'); navigate('/dashboard'); }
    else toast.error(result.message || 'Login failed');
  };

  const quickLogin = (email) => {
    setValue('email', email);
    setValue('password', 'KhanNetra@2024');
  };

  return (
    <div className="min-h-screen bg-coal-950 flex" style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(245,158,11,.06) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(249,115,22,.04) 0%, transparent 40%)' }}>

      {/* ── Left Panel ──────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-coal-900" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(245,158,11,.07) 0%, transparent 55%), radial-gradient(circle at 70% 70%, rgba(249,115,22,.05) 0%, transparent 55%)' }} />

        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Top — Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,.5)]">
            <span className="text-coal-950 font-black text-base">KN</span>
          </div>
          <div>
            <h1 className="text-coal-50 font-black text-xl leading-none">KhanNetra</h1>
            <p className="text-coal-500 text-xs mt-0.5">DGMS · Ministry of Coal · Govt. of India</p>
          </div>
        </div>

        {/* Center — Hero */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-xs font-bold">SIH Problem Statement PC-24</span>
          </div>
          <h2 className="text-coal-50 text-4xl font-black leading-[1.1] mb-4">
            Intelligent<br />
            <span className="text-amber-400">Governance.</span><br />
            Safer Mines.
          </h2>
          <p className="text-coal-400 text-base leading-relaxed max-w-md">
            AI-powered compliance monitoring and smart governance platform for India's coal mining sector.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-8">
            {STATS.map(s => (
              <div key={s.label} className="bg-coal-800/60 border border-coal-700/50 rounded-xl p-3 text-center">
                <p className="text-amber-400 font-black text-lg">{s.value}</p>
                <p className="text-coal-500 text-[10px] mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — Features */}
        <div className="relative flex flex-wrap gap-2">
          {['CMR 2017 Compliant', 'DGMS Aligned', 'Real-time Monitoring', 'AI Risk Engine', 'Multilingual'].map(f => (
            <span key={f} className="px-3 py-1 rounded-full text-[11px] font-semibold text-coal-500 bg-coal-800/60 border border-coal-700/40">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right Panel — Form ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <span className="text-coal-950 font-black">KN</span>
            </div>
            <div>
              <h1 className="text-coal-50 font-black text-lg">KhanNetra</h1>
              <p className="text-coal-500 text-xs">DGMS Compliance System</p>
            </div>
          </div>

          <div className="bg-coal-900 rounded-2xl border border-coal-700/60 p-8 shadow-panel">
            <div className="mb-7">
              <h2 className="text-2xl font-black text-coal-50">Sign In</h2>
              <p className="text-coal-500 text-sm mt-1">Enter your credentials to access the system</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="form-group">
                <label className="label">Email Address</label>
                <div className="input-group">
                  <FiUser className="input-group-icon" size={15} />
                  <input
                    {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                    type="email" className="input" placeholder="you@khannetra.gov.in"
                  />
                </div>
                {errors.email && <p className="text-xs text-danger-400 mt-1">{errors.email.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Password</label>
                <div className="input-group relative">
                  <FiLock className="input-group-icon" size={15} />
                  <input
                    {...register('password', { required: 'Password required' })}
                    type={showPwd ? 'text' : 'password'}
                    className="input pr-10" placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-coal-500 hover:text-coal-300 transition-colors">
                    {showPwd ? <FiEyeOff size={15}/> : <FiEye size={15}/>}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-danger-400 mt-1">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary btn-lg w-full justify-center mt-2">
                {isSubmitting ? (
                  <><div className="w-4 h-4 border-2 border-coal-900/40 border-t-coal-900 rounded-full animate-spin"/>Signing in…</>
                ) : (
                  <><FiShield size={16}/> Sign In Securely</>
                )}
              </button>
            </form>

            <div className="mt-4 text-center text-sm">
              <span className="text-coal-600">Don't have an account? </span>
              <Link to="/register" className="text-amber-400 font-semibold hover:text-amber-300 transition-colors">Register</Link>
            </div>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-coal-700/50">
              <div className="flex items-center gap-2 mb-3">
                <FiZap size={12} className="text-amber-500" />
                <p className="text-[10px] font-bold text-coal-500 uppercase tracking-widest">Quick Demo Access</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMOS.map(acc => (
                  <button key={acc.email} type="button" onClick={() => quickLogin(acc.email)}
                    className="text-left px-3 py-2.5 rounded-xl bg-coal-800/60 border border-coal-700/40 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group">
                    <p className="text-xs font-bold text-coal-300 group-hover:text-amber-400 transition-colors">{acc.role}</p>
                    <p className="text-[10px] text-coal-600 mt-0.5">{acc.label}</p>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-coal-700 text-center mt-3">
                Password for all: <span className="text-coal-500 font-mono">KhanNetra@2024</span>
              </p>
            </div>
          </div>

          <p className="text-center text-[10px] text-coal-700 mt-5">
            🔒 Secured · DGMS · Ministry of Coal · Govt. of India<br/>
            © 2026 KhanNetra. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

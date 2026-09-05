import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiEye, FiEyeOff, FiShield, FiUser, FiLock } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@khannetra.gov.in', label: 'System Admin' },
  { role: 'Govt Officer', email: 'officer1@khannetra.gov.in', label: 'Government Officer' },
  { role: 'Mine Manager', email: 'manager1@khannetra.gov.in', label: 'Mine Manager' },
  { role: 'Inspector', email: 'inspector1@khannetra.gov.in', label: 'DGMS Inspector' },
  { role: 'Safety Officer', email: 'safety1@khannetra.gov.in', label: 'Safety Officer' },
  { role: 'Env. Officer', email: 'env1@khannetra.gov.in', label: 'Environment Officer' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPwd, setShowPwd] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    const result = await login(data);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.message || 'Login failed');
    }
  };

  const quickLogin = (email) => {
    setValue('email', email);
    setValue('password', 'KhanNetra@2024');
  };

  return (
    <div className="min-h-screen bg-gov-900 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-gov-900 via-gov-800 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary-500 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-primary-700 blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-xl">KN</span>
            </div>
            <div>
              <h1 className="text-white font-black text-2xl">KhanNetra</h1>
              <p className="text-primary-300 text-xs">DGMS | Ministry of Coal</p>
            </div>
          </div>
          <h2 className="text-white text-4xl font-black leading-tight mb-4">
            Intelligent<br />Governance.<br />
            <span className="text-primary-400">Safer Mines.</span><br />
            Smarter Compliance.
          </h2>
          <p className="text-coal-300 text-base leading-relaxed max-w-md">
            AI-powered monitoring for India's coal mines. Real-time compliance tracking, risk prediction, and automated governance for DGMS.
          </p>
        </div>

        <div className="relative grid grid-cols-2 gap-4">
          {[
            { label: 'Mines Monitored', value: '6+' },
            { label: 'Compliance Parameters', value: '50+' },
            { label: 'AI Risk Assessments', value: 'Real-time' },
            { label: 'Digital Reports', value: 'Instant' },
          ].map(item => (
            <div key={item.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white text-2xl font-black">{item.value}</div>
              <div className="text-coal-300 text-xs mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex -space-x-2">
            {['R','P','A','S','G'].map((l, i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-primary-600 border-2 border-gov-900 flex items-center justify-center text-white text-xs font-bold">{l}</div>
            ))}
          </div>
          <p className="text-coal-300 text-xs">Used by DGMS officials, Mine Managers & Inspectors</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-coal-50">
        <div className="w-full max-w-md">
          {/* Logo (mobile) */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-lg">KN</span>
            </div>
            <div>
              <h1 className="text-coal-900 font-black text-xl">KhanNetra</h1>
              <p className="text-coal-500 text-xs">DGMS Compliance System</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-coal-200">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-coal-900">Sign In</h2>
              <p className="text-coal-500 text-sm mt-1">Enter your credentials to access the system</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="form-group">
                <label className="label">Email Address</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-coal-400" size={16} />
                  <input
                    {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                    type="email"
                    className="input pl-9"
                    placeholder="you@khannetra.gov.in"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-coal-400" size={16} />
                  <input
                    {...register('password', { required: 'Password required' })}
                    type={showPwd ? 'text' : 'password'}
                    className="input pl-9 pr-9"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-coal-400 hover:text-coal-600">
                    {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3 text-base font-semibold">
                {isSubmitting ? (
                  <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</span>
                ) : (
                  <span className="flex items-center gap-2"><FiShield size={18} /> Sign In Securely</span>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-coal-500 text-sm">Don't have an account? </span>
              <Link to="/register" className="text-primary-600 font-semibold text-sm hover:underline">Register</Link>
            </div>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-coal-100">
              <p className="text-xs font-semibold text-coal-500 uppercase tracking-wide mb-3">Quick Demo Access</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => quickLogin(acc.email)}
                    className="text-left px-3 py-2 rounded-lg border border-coal-200 hover:border-primary-300 hover:bg-primary-50 transition-colors group"
                  >
                    <p className="text-xs font-bold text-coal-700 group-hover:text-primary-700">{acc.role}</p>
                    <p className="text-[10px] text-coal-400 truncate">{acc.label}</p>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-coal-400 text-center mt-2">Password: KhanNetra@2024</p>
            </div>
          </div>

          <p className="text-center text-xs text-coal-400 mt-6">
            🔒 Secured by DGMS | Ministry of Coal, Govt. of India<br />
            © 2026 KhanNetra. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

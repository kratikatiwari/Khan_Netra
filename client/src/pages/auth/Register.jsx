import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';

const ROLES = [
  { value: 'mine_manager', label: 'Mine Manager' },
  { value: 'inspector', label: 'Inspector (DGMS)' },
  { value: 'safety_officer', label: 'Safety Officer' },
  { value: 'environment_officer', label: 'Environment Officer' },
  { value: 'government_officer', label: 'Government Officer' },
];

export default function Register() {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      const res = await authApi.register(data);
      if (res.success) {
        toast.success('Registration successful! Please log in.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gov-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">KN</span>
          </div>
          <div>
            <h1 className="text-white font-black text-xl">KhanNetra</h1>
            <p className="text-coal-400 text-xs">DGMS Compliance System</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-coal-200">
          <h2 className="text-2xl font-black text-coal-900 mb-1">Create Account</h2>
          <p className="text-coal-500 text-sm mb-6">Register for KhanNetra access</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group col-span-2">
                <label className="label">Full Name *</label>
                <input {...register('full_name', { required: 'Full name required' })} className="input" placeholder="Dr. Raj Kumar" />
                {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
              </div>

              <div className="form-group col-span-2">
                <label className="label">Email Address *</label>
                <input {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })} type="email" className="input" placeholder="name@domain.gov.in" />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div className="form-group col-span-2 relative">
                <label className="label">Password *</label>
                <input {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 characters' } })} type={showPwd ? 'text' : 'password'} className="input pr-9" placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 bottom-2.5 text-coal-400">
                  {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Role *</label>
                <select {...register('role', { required: 'Role required' })} className="select">
                  <option value="">Select Role</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
              </div>

              <div className="form-group">
                <label className="label">Phone</label>
                <input {...register('phone')} className="input" placeholder="+91-9876543210" />
              </div>

              <div className="form-group col-span-2">
                <label className="label">Designation</label>
                <input {...register('designation')} className="input" placeholder="Inspector of Mines / Mine Manager" />
              </div>

              <div className="form-group col-span-2">
                <label className="label">Department / Organization</label>
                <input {...register('department')} className="input" placeholder="DGMS, Ministry of Coal" />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3">
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-coal-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign In</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

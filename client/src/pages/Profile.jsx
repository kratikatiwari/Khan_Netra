import { useState } from 'react';
import { FiUser, FiLock, FiSave } from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { authApi } from '../services/api';
import useAuthStore from '../store/authStore';
import { formatDate } from '../utils/helpers';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';
import { ROLES } from '../utils/helpers';

export default function Profile() {
  const { user, refreshUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  const { register: regProfile, handleSubmit: handleProfile, formState: { isSubmitting: ps } } = useForm({ defaultValues: user || {} });
  const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd, formState: { isSubmitting: pwds } } = useForm();

  const onProfileSave = async (data) => {
    try {
      await authApi.updateProfile(data);
      await refreshUser();
      toast.success('Profile updated');
    } catch {}
  };

  const onPasswordChange = async (data) => {
    if (data.new_password !== data.confirm_password) { toast.error('Passwords do not match'); return; }
    try {
      await authApi.changePassword(data);
      toast.success('Password changed');
      resetPwd();
    } catch {}
  };

  const role = ROLES[user?.role];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account information and security settings</p>
      </div>

      {/* Profile Card */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-black shrink-0">
          {user?.full_name?.[0] || 'U'}
        </div>
        <div>
          <h2 className="text-lg font-bold text-coal-900">{user?.full_name}</h2>
          <p className="text-sm text-coal-500">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {role && <Badge color="blue">{role.label}</Badge>}
            {user?.designation && <span className="text-xs text-coal-400">· {user.designation}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-coal-100 p-1 rounded-xl w-fit">
        {[{ id: 'profile', label: 'Profile Info', icon: FiUser }, { id: 'password', label: 'Change Password', icon: FiLock }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === t.id ? 'bg-white text-coal-900 shadow-sm' : 'text-coal-500'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="card">
          <form onSubmit={handleProfile(onProfileSave)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group col-span-2">
                <label className="label">Full Name</label>
                <input {...regProfile('full_name')} className="input" />
              </div>
              <div className="form-group">
                <label className="label">Email</label>
                <input value={user?.email} disabled className="input bg-coal-50 text-coal-400" />
              </div>
              <div className="form-group">
                <label className="label">Phone</label>
                <input {...regProfile('phone')} className="input" />
              </div>
              <div className="form-group">
                <label className="label">Designation</label>
                <input {...regProfile('designation')} className="input" />
              </div>
              <div className="form-group">
                <label className="label">Department</label>
                <input {...regProfile('department')} className="input" />
              </div>
            </div>
            <div className="pt-2">
              <p className="text-xs text-coal-400 mb-3">Last login: {formatDate(user?.last_login) || 'N/A'}</p>
              <button type="submit" disabled={ps} className="btn-primary"><FiSave size={16} />{ps ? 'Saving...' : 'Save Profile'}</button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="card">
          <form onSubmit={handlePwd(onPasswordChange)} className="space-y-4">
            <div className="form-group">
              <label className="label">Current Password *</label>
              <input type="password" {...regPwd('current_password', { required: true })} className="input" />
            </div>
            <div className="form-group">
              <label className="label">New Password *</label>
              <input type="password" {...regPwd('new_password', { required: true, minLength: 8 })} className="input" />
            </div>
            <div className="form-group">
              <label className="label">Confirm New Password *</label>
              <input type="password" {...regPwd('confirm_password', { required: true })} className="input" />
            </div>
            <button type="submit" disabled={pwds} className="btn-primary"><FiLock size={16} />{pwds ? 'Changing...' : 'Change Password'}</button>
          </form>
        </div>
      )}
    </div>
  );
}

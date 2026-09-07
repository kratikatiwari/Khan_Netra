import { useState } from 'react';
import { FiUser, FiLock, FiSave, FiShield } from 'react-icons/fi';
import { useForm } from 'react-hook-form';
import { authApi } from '../services/api';
import useAuthStore from '../store/authStore';
import { formatDate, ROLES } from '../utils/helpers';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Profile() {
  const { user, refreshUser } = useAuthStore();
  const [tab, setTab] = useState('profile');

  const { register: rP, handleSubmit: hP, formState:{isSubmitting:psub} } = useForm({ defaultValues: user||{} });
  const { register: rW, handleSubmit: hW, reset: resetPwd, formState:{isSubmitting:pwsub} } = useForm();

  const saveProfile = async (data) => {
    try { await authApi.updateProfile(data); await refreshUser(); toast.success('Profile updated'); }
    catch {}
  };
  const changePassword = async (data) => {
    if (data.new_password !== data.confirm_password) { toast.error('Passwords do not match'); return; }
    try { await authApi.changePassword(data); toast.success('Password changed'); resetPwd(); }
    catch {}
  };

  const roleInfo = ROLES[user?.role];

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account information and security</p>
      </div>

      {/* Profile card */}
      <div className="card flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,.2)]">
          <span className="text-amber-400 text-2xl font-black">{user?.full_name?.[0]||'U'}</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-coal-50">{user?.full_name}</h2>
          <p className="text-coal-500 text-sm">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            {roleInfo && <Badge color={roleInfo.color}>{roleInfo.label}</Badge>}
            {user?.designation && <span className="text-xs text-coal-600">· {user.designation}</span>}
          </div>
        </div>
        <div className="ml-auto text-right hidden sm:block">
          <p className="text-[10px] text-coal-600 uppercase tracking-widest">Last Login</p>
          <p className="text-xs text-coal-400 mt-0.5">{formatDate(user?.last_login)||'—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[{id:'profile',label:'Profile Info',icon:FiUser},{id:'password',label:'Change Password',icon:FiLock}].map(t=>(
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('tab-item flex items-center gap-2', tab===t.id && 'active')}>
            <t.icon size={13}/>{t.label}
          </button>
        ))}
      </div>

      {tab==='profile' && (
        <div className="card">
          <form onSubmit={hP(saveProfile)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group col-span-2">
                <label className="label">Full Name</label>
                <input {...rP('full_name')} className="input"/>
              </div>
              <div className="form-group">
                <label className="label">Email</label>
                <input value={user?.email} disabled className="input opacity-50 cursor-not-allowed"/>
              </div>
              <div className="form-group">
                <label className="label">Phone</label>
                <input {...rP('phone')} className="input"/>
              </div>
              <div className="form-group">
                <label className="label">Designation</label>
                <input {...rP('designation')} className="input"/>
              </div>
              <div className="form-group">
                <label className="label">Department</label>
                <input {...rP('department')} className="input"/>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-coal-700/50">
              <button type="submit" disabled={psub} className="btn-primary">
                <FiSave size={15}/> {psub ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab==='password' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
            <FiShield size={14} className="text-amber-400"/>
            <p className="text-xs text-amber-400">Use a strong password with at least 8 characters, numbers and symbols.</p>
          </div>
          <form onSubmit={hW(changePassword)} className="space-y-4">
            <div className="form-group">
              <label className="label">Current Password *</label>
              <input type="password" {...rW('current_password',{required:true})} className="input"/>
            </div>
            <div className="form-group">
              <label className="label">New Password *</label>
              <input type="password" {...rW('new_password',{required:true,minLength:8})} className="input"/>
            </div>
            <div className="form-group">
              <label className="label">Confirm New Password *</label>
              <input type="password" {...rW('confirm_password',{required:true})} className="input"/>
            </div>
            <div className="flex justify-end pt-2 border-t border-coal-700/50">
              <button type="submit" disabled={pwsub} className="btn-primary">
                <FiLock size={15}/> {pwsub ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

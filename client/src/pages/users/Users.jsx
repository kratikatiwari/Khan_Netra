import { useState, useEffect } from 'react';
import { FiUsers, FiEdit2, FiSearch } from 'react-icons/fi';
import { aiApi } from '../../services/api';
import { formatDate, ROLES } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import clsx from 'clsx';

const ROLE_COLOR = { admin:'red', government_officer:'blue', mine_manager:'yellow', inspector:'green', safety_officer:'orange', environment_officer:'teal' };

export default function Users() {
  const { user: me } = useAuthStore();
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [editUser,  setEditUser]  = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await aiApi.getUsers(); setUsers(r.data); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><FiUsers className="text-amber-400"/> User Management</h1>
          <p className="page-subtitle">Manage system users, roles and access permissions</p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-coal-800 border border-coal-700/60 text-xs text-coal-500">
          {users.length} registered users
        </div>
      </div>

      <div className="card-sm">
        <div className="relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-coal-600"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} className="input pl-9" placeholder="Search users by name, email, role…"/>
        </div>
      </div>

      {loading ? <PageLoader/> : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>User</th><th>Role</th><th>Designation</th><th>Department</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <span className="text-amber-400 text-xs font-black">{u.full_name[0]}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-coal-200 text-sm">{u.full_name}</p>
                        <p className="text-[11px] text-coal-600">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><Badge color={ROLE_COLOR[u.role]||'gray'}>{u.role.replace(/_/g,' ')}</Badge></td>
                  <td><span className="text-xs text-coal-400">{u.designation||'—'}</span></td>
                  <td><span className="text-xs text-coal-500">{u.department||'—'}</span></td>
                  <td><span className="text-xs text-coal-600">{formatDate(u.last_login)||'Never'}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={clsx('w-2 h-2 rounded-full', u.is_active ? 'bg-success-500 shadow-[0_0_6px_rgba(34,197,94,.6)]' : 'bg-coal-700')}/>
                      <span className="text-xs text-coal-500">{u.is_active?'Active':'Inactive'}</span>
                    </div>
                  </td>
                  <td>
                    {me?.role==='admin' && u.id!==me.id && (
                      <button onClick={() => setEditUser(u)}
                        className="p-1.5 rounded-lg text-coal-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                        <FiEdit2 size={14}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="sm">
        {editUser && <EditUserForm user={editUser} onSave={() => { setEditUser(null); load(); }} onCancel={() => setEditUser(null)}/>}
      </Modal>
    </div>
  );
}

function EditUserForm({ user, onSave, onCancel }) {
  const { register, handleSubmit, formState:{isSubmitting} } = useForm({
    defaultValues: { role:user.role, is_active:user.is_active, designation:user.designation, department:user.department }
  });
  const onSubmit = async (data) => {
    try { await aiApi.updateUser(user.id, data); toast.success('User updated'); onSave(); } catch {}
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="form-group">
        <label className="label">Role</label>
        <select {...register('role')} className="select">
          {Object.entries(ROLES).map(([v,r])=><option key={v} value={v}>{r.label}</option>)}
        </select>
      </div>
      <div className="form-group"><label className="label">Designation</label><input {...register('designation')} className="input"/></div>
      <div className="form-group"><label className="label">Department</label><input {...register('department')} className="input"/></div>
      <div className="form-group">
        <label className="label">Status</label>
        <select {...register('is_active')} className="select">
          <option value={true}>Active</option><option value={false}>Inactive</option>
        </select>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-coal-700/50">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting?'Saving…':'Update User'}</button>
      </div>
    </form>
  );
}

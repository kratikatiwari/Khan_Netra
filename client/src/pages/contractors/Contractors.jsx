import { useState, useEffect } from 'react';
import { FiPlus, FiUsers, FiSearch, FiEye, FiEdit2, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { contractorsApi, minesApi } from '../../services/api';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ScoreBar from '../../components/ui/ScoreBar';
import { useForm } from 'react-hook-form';
import useAuthStore from '../../store/authStore';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_COLOR = { active:'green', suspended:'red', expired:'yellow', terminated:'gray' };

export default function Contractors() {
  const { user } = useAuthStore();
  const [contractors, setContractors] = useState([]);
  const [mines,       setMines]       = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [statusF,     setStatusF]     = useState('');
  const [showForm,    setShowForm]    = useState(false);
  const [editItem,    setEditItem]    = useState(null);
  const [viewItem,    setViewItem]    = useState(null);
  const [deleteId,    setDeleteId]    = useState(null);
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState({});

  const canWrite = ['admin','government_officer','mine_manager','inspector'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        contractorsApi.getAll({ status: statusF, page, limit: 15 }),
        contractorsApi.getStats(),
      ]);
      setContractors(r.data || []);
      setPagination(r.pagination || {});
      setStats(s.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusF, page]);
  useEffect(() => { minesApi.getAll({ limit: 100 }).then(r => setMines(r.data || [])).catch(() => {}); }, []);

  const filtered = search
    ? contractors.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.work_type?.toLowerCase().includes(search.toLowerCase()))
    : contractors;

  const handleDelete = async () => {
    try { await contractorsApi.delete(deleteId); toast.success('Deleted'); setDeleteId(null); load(); } catch {}
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><FiUsers className="text-amber-400"/> Contractor Management</h1>
          <p className="page-subtitle">Track contractor compliance, safety records and contract status</p>
        </div>
        {canWrite && <button onClick={() => setShowForm(true)} className="btn-primary"><FiPlus size={15}/> Add Contractor</button>}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Total', value: stats.totals?.total||0, color:'text-coal-200' },
            { label:'Avg Safety', value: `${parseFloat(stats.totals?.avg_safety||0).toFixed(0)}%`, color:'text-amber-400' },
            { label:'Avg Compliance', value: `${parseFloat(stats.totals?.avg_compliance||0).toFixed(0)}%`, color:'text-success-400' },
            { label:'Low Compliance', value: stats.lowCompliance?.length||0, color:'text-danger-400' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-[11px] text-coal-500 uppercase tracking-widest mb-1">{s.label}</p>
              <p className={clsx('text-2xl font-black', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Low-compliance warning */}
      {stats?.lowCompliance?.length > 0 && (
        <div className="card-danger p-4">
          <div className="flex items-center gap-2 mb-2"><FiAlertTriangle className="text-danger-400" size={16}/><span className="font-bold text-danger-300 text-sm">Low Compliance Contractors</span></div>
          <div className="flex flex-wrap gap-2">
            {stats.lowCompliance.map(c => (
              <span key={c.id} className="px-2 py-1 rounded-lg text-xs bg-danger-600/20 text-danger-300 border border-danger-500/30">
                {c.name} — {parseFloat(c.compliance_score).toFixed(0)}% ({c.mine_name})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card-sm flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-coal-600"/>
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search contractors…"/>
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="select w-36">
          <option value="">All Status</option>
          {['active','suspended','expired','terminated'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <PageLoader/> : filtered.length === 0 ? (
        <EmptyState icon={FiUsers} title="No contractors found"
          action={canWrite && <button onClick={() => setShowForm(true)} className="btn-primary">Add Contractor</button>}/>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Contractor</th><th>Mine</th><th>Work Type</th><th>Safety</th><th>Compliance</th><th>Workers</th><th>Contract End</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <p className="font-bold text-coal-100 text-sm">{c.name}</p>
                    <p className="text-[11px] text-coal-600 font-mono">{c.registration_number||'—'}</p>
                  </td>
                  <td><span className="text-sm text-coal-300">{c.mine_name}</span></td>
                  <td><span className="text-sm text-coal-400">{c.work_type}</span></td>
                  <td>
                    <div className="w-20">
                      <span className={clsx('text-xs font-bold', parseFloat(c.safety_score)>=80?'text-success-400':parseFloat(c.safety_score)>=60?'text-amber-400':'text-danger-400')}>
                        {parseFloat(c.safety_score).toFixed(0)}%
                      </span>
                      <ScoreBar score={c.safety_score} showLabel={false} height="h-1"/>
                    </div>
                  </td>
                  <td>
                    <div className="w-20">
                      <span className={clsx('text-xs font-bold', parseFloat(c.compliance_score)>=80?'text-success-400':parseFloat(c.compliance_score)>=60?'text-amber-400':'text-danger-400')}>
                        {parseFloat(c.compliance_score).toFixed(0)}%
                      </span>
                      <ScoreBar score={c.compliance_score} showLabel={false} height="h-1"/>
                    </div>
                  </td>
                  <td><span className="text-sm text-coal-300">{c.workers_count}</span></td>
                  <td>
                    <span className={clsx('text-xs font-semibold', c.contract_end && new Date(c.contract_end) < new Date() ? 'text-danger-400' : c.contract_end && new Date(c.contract_end) < new Date(Date.now()+90*864e5) ? 'text-amber-400' : 'text-coal-400')}>
                      {formatDate(c.contract_end)}
                    </span>
                  </td>
                  <td><Badge color={STATUS_COLOR[c.status]||'gray'} dot>{c.status}</Badge></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setViewItem(c)} className="p-1.5 rounded-lg text-coal-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"><FiEye size={14}/></button>
                      {canWrite && <button onClick={() => { setEditItem(c); setShowForm(true); }} className="p-1.5 rounded-lg text-coal-600 hover:text-info-400 hover:bg-info-500/10 transition-colors"><FiEdit2 size={14}/></button>}
                      {user?.role==='admin' && <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg text-coal-600 hover:text-danger-400 hover:bg-danger-600/10 transition-colors"><FiTrash2 size={14}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View modal */}
      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title={viewItem?.name} size="md">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex gap-2"><Badge color={STATUS_COLOR[viewItem.status]||'gray'}>{viewItem.status}</Badge></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Reg. #',viewItem.registration_number||'—'],['Mine',viewItem.mine_name],['Work Type',viewItem.work_type],['Workers',viewItem.workers_count],
                ['Contract Start',formatDate(viewItem.contract_start)],['Contract End',formatDate(viewItem.contract_end)],
                ['Contact',viewItem.contact_name||'—'],['Phone',viewItem.contact_phone||'—']
              ].map(([k,v]) => (
                <div key={k}><p className="text-[10px] text-coal-600 uppercase tracking-widest mb-0.5">{k}</p><p className="font-semibold text-coal-200">{v}</p></div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="label mb-2">Safety Score</p><ScoreBar score={viewItem.safety_score}/></div>
              <div><p className="label mb-2">Compliance Score</p><ScoreBar score={viewItem.compliance_score}/></div>
            </div>
            {viewItem.notes && <div className="p-3 rounded-xl bg-coal-800/60 border border-coal-700/40"><p className="text-xs text-coal-300">{viewItem.notes}</p></div>}
          </div>
        )}
      </Modal>

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Contractor' : 'Add Contractor'} size="lg">
        <ContractorForm mines={mines} contractor={editItem} onSave={() => { setShowForm(false); setEditItem(null); load(); }} onCancel={() => { setShowForm(false); setEditItem(null); }}/>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Contractor" message="Delete this contractor record? This cannot be undone." danger confirmText="Delete"/>
    </div>
  );
}

function ContractorForm({ mines, contractor, onSave, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: contractor || {} });
  const onSubmit = async (data) => {
    try {
      if (contractor?.id) { await contractorsApi.update(contractor.id, data); toast.success('Updated'); }
      else                { await contractorsApi.create(data);                toast.success('Contractor added'); }
      onSave();
    } catch {}
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2"><label className="label">Contractor Name *</label><input {...register('name',{required:true})} className="input" placeholder="Bharat Mining Services Pvt Ltd"/></div>
        <div className="form-group"><label className="label">Registration #</label><input {...register('registration_number')} className="input" placeholder="REG-2024-001"/></div>
        <div className="form-group"><label className="label">Mine *</label><select {...register('mine_id',{required:true})} className="select"><option value="">Select Mine</option>{mines.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
        <div className="form-group"><label className="label">Work Type *</label><input {...register('work_type',{required:true})} className="input" placeholder="Drilling & Blasting"/></div>
        <div className="form-group"><label className="label">Workers Count</label><input type="number" {...register('workers_count')} className="input"/></div>
        <div className="form-group"><label className="label">Contract Start</label><input type="date" {...register('contract_start')} className="input"/></div>
        <div className="form-group"><label className="label">Contract End</label><input type="date" {...register('contract_end')} className="input"/></div>
        <div className="form-group"><label className="label">Safety Score (0-100)</label><input type="number" min="0" max="100" {...register('safety_score')} className="input"/></div>
        <div className="form-group"><label className="label">Compliance Score (0-100)</label><input type="number" min="0" max="100" {...register('compliance_score')} className="input"/></div>
        <div className="form-group"><label className="label">Status</label><select {...register('status')} className="select"><option value="active">Active</option><option value="suspended">Suspended</option><option value="expired">Expired</option><option value="terminated">Terminated</option></select></div>
        <div className="form-group"><label className="label">Contact Name</label><input {...register('contact_name')} className="input"/></div>
        <div className="form-group"><label className="label">Contact Phone</label><input {...register('contact_phone')} className="input"/></div>
        <div className="form-group col-span-2"><label className="label">Notes</label><textarea {...register('notes')} rows={2} className="input resize-none"/></div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-coal-700/50">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting?'Saving…':contractor?'Update':'Add Contractor'}</button>
      </div>
    </form>
  );
}

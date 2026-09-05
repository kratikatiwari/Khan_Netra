import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPlus, FiClipboard, FiEye, FiEdit2, FiCalendar, FiCheck } from 'react-icons/fi';
import { inspectionsApi, minesApi } from '../../services/api';
import { formatDate } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import ScoreBar from '../../components/ui/ScoreBar';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import useAuthStore from '../../store/authStore';

const STATUS_COLOR = { scheduled: 'blue', in_progress: 'yellow', completed: 'green', cancelled: 'gray', rescheduled: 'orange' };

const DEFAULT_CHECKLIST = [
  { category: 'Ventilation', item_description: 'Adequate air circulation in all working areas', score: 0, is_compliant: null, remarks: '' },
  { category: 'Fire Safety', item_description: 'Fire extinguishers present and non-expired', score: 0, is_compliant: null, remarks: '' },
  { category: 'Strata Control', item_description: 'Roof support systems in place and adequate', score: 0, is_compliant: null, remarks: '' },
  { category: 'PPE', item_description: 'All workers using required PPE', score: 0, is_compliant: null, remarks: '' },
  { category: 'Electrical Safety', item_description: 'All electrical equipment certified and safe', score: 0, is_compliant: null, remarks: '' },
  { category: 'Emergency Procedures', item_description: 'Emergency escape routes clear and marked', score: 0, is_compliant: null, remarks: '' },
  { category: 'First Aid', item_description: 'First aid kits stocked and accessible', score: 0, is_compliant: null, remarks: '' },
  { category: 'Dust Control', item_description: 'Dust suppression systems operational', score: 0, is_compliant: null, remarks: '' },
];

export default function Inspections() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [inspections, setInspections] = useState([]);
  const [mines, setMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', type: '', mine_id: searchParams.get('mine_id') || '' });
  const [showForm, setShowForm] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [checklistModal, setChecklistModal] = useState(null);
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await inspectionsApi.getAll({ ...filters });
      setInspections(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); minesApi.getAll({ limit: 100 }).then(r => setMines(r.data)).catch(() => {}); }, [filters]);

  const handleViewFull = async (id) => {
    try {
      const res = await inspectionsApi.getById(id);
      setViewItem(res.data);
    } catch {}
  };

  const updateChecklist = (i, field, value) => {
    setChecklist(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value, score: field === 'is_compliant' ? (value ? 90 : 30) : item.score } : item));
  };

  const saveChecklist = async () => {
    try {
      await inspectionsApi.saveChecklist({ inspection_id: checklistModal.id, items: checklist });
      toast.success('Checklist saved');
      setChecklistModal(null);
      fetch();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Inspections</h1>
          <p className="page-subtitle">Schedule, conduct and manage mine inspections</p>
        </div>
        {['admin', 'government_officer', 'inspector'].includes(user?.role) && (
          <button onClick={() => setShowForm(true)} className="btn-primary"><FiPlus size={16} /> Schedule Inspection</button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        {['', 'scheduled', 'in_progress', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilters(p => ({ ...p, status: s }))}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              filters.status === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-coal-600 border-coal-200 hover:bg-coal-50')}>
            {s === '' ? 'All' : s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
          </button>
        ))}
        <select value={filters.mine_id} onChange={e => setFilters(p => ({ ...p, mine_id: e.target.value }))} className="select w-48 ml-auto">
          <option value="">All Mines</option>
          {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : inspections.length === 0 ? (
        <EmptyState icon={FiClipboard} title="No inspections found" />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Inspection #</th>
                <th>Mine</th>
                <th>Type</th>
                <th>Inspector</th>
                <th>Scheduled Date</th>
                <th>Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map(ins => (
                <tr key={ins.id}>
                  <td><span className="font-mono text-xs font-bold">{ins.inspection_number}</span></td>
                  <td>
                    <p className="font-medium text-sm">{ins.mine_name}</p>
                    <p className="text-[11px] text-coal-400">{ins.state}</p>
                  </td>
                  <td><span className="text-sm">{ins.type}</span></td>
                  <td><span className="text-sm">{ins.inspector_name || '—'}</span></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <FiCalendar size={13} className="text-coal-400" />
                      <span className="text-xs">{formatDate(ins.scheduled_date)}</span>
                    </div>
                  </td>
                  <td>
                    {ins.overall_score ? (
                      <div className="w-20">
                        <span className={clsx('text-xs font-bold', ins.overall_score >= 80 ? 'text-green-600' : ins.overall_score >= 60 ? 'text-yellow-600' : 'text-red-600')}>{parseFloat(ins.overall_score).toFixed(1)}%</span>
                        <ScoreBar score={ins.overall_score} showLabel={false} height="h-1.5" />
                      </div>
                    ) : <span className="text-xs text-coal-300">Pending</span>}
                  </td>
                  <td><Badge color={STATUS_COLOR[ins.status]} dot>{ins.status.replace('_', ' ')}</Badge></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => handleViewFull(ins.id)} className="p-1.5 rounded hover:bg-coal-100 text-coal-500"><FiEye size={15} /></button>
                      {ins.status === 'scheduled' && ['admin','inspector','government_officer'].includes(user?.role) && (
                        <button onClick={() => { setChecklist(DEFAULT_CHECKLIST); setChecklistModal(ins); }} className="p-1.5 rounded hover:bg-green-50 text-green-500" title="Fill Checklist"><FiCheck size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title={`Inspection ${viewItem?.inspection_number}`} size="lg">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge color={STATUS_COLOR[viewItem.status]}>{viewItem.status}</Badge>
              {viewItem.follow_up_required && <Badge color="yellow">Follow-up Required</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-coal-400">Mine</p><p className="font-medium">{viewItem.mine_name} ({viewItem.mine_type})</p></div>
              <div><p className="text-xs text-coal-400">Inspector</p><p>{viewItem.inspector_name}</p></div>
              <div><p className="text-xs text-coal-400">Scheduled</p><p>{formatDate(viewItem.scheduled_date)}</p></div>
              <div><p className="text-xs text-coal-400">Completed</p><p>{formatDate(viewItem.completed_date) || '—'}</p></div>
              {viewItem.overall_score && <div className="col-span-2"><p className="text-xs text-coal-400 mb-1">Score</p><ScoreBar score={viewItem.overall_score} /></div>}
            </div>
            {viewItem.findings && <div><p className="text-xs text-coal-400 mb-1">Findings</p><p className="text-sm bg-coal-50 rounded-lg p-3">{viewItem.findings}</p></div>}
            {viewItem.recommendations && <div><p className="text-xs text-coal-400 mb-1">Recommendations</p><p className="text-sm bg-blue-50 rounded-lg p-3">{viewItem.recommendations}</p></div>}
            {viewItem.checklist?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-coal-600 mb-2">CHECKLIST ITEMS</p>
                <div className="space-y-2">
                  {viewItem.checklist.map(item => (
                    <div key={item.id} className={clsx('flex items-center justify-between p-2 rounded-lg text-xs', item.is_compliant ? 'bg-green-50' : 'bg-red-50')}>
                      <span className="font-medium">{item.category}: {item.item_description}</span>
                      <Badge color={item.is_compliant ? 'green' : 'red'}>{item.is_compliant ? 'Compliant' : 'Non-compliant'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Checklist Modal */}
      <Modal isOpen={!!checklistModal} onClose={() => setChecklistModal(null)} title="Inspection Checklist" size="lg"
        footer={<div className="flex justify-end gap-3"><button onClick={() => setChecklistModal(null)} className="btn-secondary">Cancel</button><button onClick={saveChecklist} className="btn-primary">Save Checklist</button></div>}>
        {checklistModal && (
          <div className="space-y-3">
            <p className="text-sm text-coal-500">Mine: <strong>{checklistModal.mine_name}</strong> · {checklistModal.type}</p>
            {checklist.map((item, i) => (
              <div key={i} className="p-3 border border-coal-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-coal-700">{item.category}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateChecklist(i, 'is_compliant', true)} className={clsx('px-2 py-1 rounded text-xs font-semibold', item.is_compliant === true ? 'bg-green-500 text-white' : 'bg-coal-100 text-coal-600')}>✓ Compliant</button>
                    <button type="button" onClick={() => updateChecklist(i, 'is_compliant', false)} className={clsx('px-2 py-1 rounded text-xs font-semibold', item.is_compliant === false ? 'bg-red-500 text-white' : 'bg-coal-100 text-coal-600')}>✗ Non-compliant</button>
                  </div>
                </div>
                <p className="text-xs text-coal-600 mb-2">{item.item_description}</p>
                <input value={item.remarks} onChange={e => updateChecklist(i, 'remarks', e.target.value)} className="input text-xs py-1" placeholder="Remarks..." />
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Schedule Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Schedule Inspection" size="md">
        <ScheduleForm mines={mines} onSave={() => { setShowForm(false); fetch(); }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

function ScheduleForm({ mines, onSave, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { scheduled_date: new Date().toISOString().split('T')[0] }
  });
  const onSubmit = async (data) => {
    try {
      await inspectionsApi.create(data);
      toast.success('Inspection scheduled');
      onSave();
    } catch {}
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="form-group">
        <label className="label">Mine *</label>
        <select {...register('mine_id', { required: true })} className="select">
          <option value="">Select Mine</option>
          {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="label">Inspection Type *</label>
        <select {...register('type', { required: true })} className="select">
          <option value="">Select Type</option>
          {['Routine Safety','Environmental Compliance','Special Investigation','Emergency Inspection','Quarterly Review','Annual Audit'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="label">Scheduled Date *</label>
        <input type="date" {...register('scheduled_date', { required: true })} className="input" />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Scheduling...' : 'Schedule Inspection'}</button>
      </div>
    </form>
  );
}

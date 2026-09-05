import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiPlus, FiSearch, FiAlertCircle, FiEye, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import { violationsApi, minesApi } from '../../services/api';
import { formatDate, formatCurrency, getSeverityColor, getStatusColor } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import ViolationForm from './ViolationForm';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Violations() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [violations, setViolations] = useState([]);
  const [mines, setMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', severity: '', mine_id: searchParams.get('mine_id') || '' });
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);

  const canCreate = ['admin', 'government_officer', 'inspector', 'safety_officer'].includes(user?.role);
  const canDelete = user?.role === 'admin';

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await violationsApi.getAll({ search, ...filters, page, limit: 15 });
      setViolations(res.data);
      setPagination(res.pagination);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [search, filters, page]);
  useEffect(() => { minesApi.getAll({ limit: 100 }).then(r => setMines(r.data)).catch(() => {}); }, []);

  const handleDelete = async () => {
    try {
      await violationsApi.delete(deleteId);
      toast.success('Violation deleted');
      setDeleteId(null);
      fetch();
    } catch {}
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await violationsApi.update(id, { status });
      toast.success('Status updated');
      fetch();
    } catch {}
  };

  const SEVERITY_BADGE = { critical: 'red', high: 'yellow', medium: 'blue', low: 'green' };
  const STATUS_BADGE = { open: 'red', under_review: 'yellow', action_taken: 'blue', closed: 'green', appealed: 'purple' };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Violations</h1>
          <p className="page-subtitle">Track regulatory violations and corrective actions</p>
        </div>
        {canCreate && <button onClick={() => setShowForm(true)} className="btn-primary"><FiPlus size={16} /> Report Violation</button>}
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'All', value: '', count: null },
          { label: 'Open', value: 'open', color: 'red' },
          { label: 'Under Review', value: 'under_review', color: 'yellow' },
          { label: 'Action Taken', value: 'action_taken', color: 'blue' },
          { label: 'Closed', value: 'closed', color: 'green' },
        ].map(f => (
          <button key={f.value} onClick={() => setFilters(p => ({ ...p, status: f.value }))}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              filters.status === f.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-coal-600 border-coal-200 hover:bg-coal-50')}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-coal-400" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search violations..." />
        </div>
        <select value={filters.severity} onChange={e => setFilters(p => ({ ...p, severity: e.target.value }))} className="select w-36">
          <option value="">All Severity</option>
          {['critical','high','medium','low'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={filters.mine_id} onChange={e => setFilters(p => ({ ...p, mine_id: e.target.value }))} className="select w-48">
          <option value="">All Mines</option>
          {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : violations.length === 0 ? (
        <EmptyState icon={FiAlertCircle} title="No violations found" message="No violations match your current filters." />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Violation #</th>
                <th>Mine</th>
                <th>Type / Category</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Fine Amount</th>
                <th>Detected</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {violations.map(v => (
                <tr key={v.id}>
                  <td><span className="font-mono text-xs font-bold text-coal-700">{v.violation_number}</span></td>
                  <td>
                    <p className="font-medium text-sm">{v.mine_name}</p>
                    <p className="text-[11px] text-coal-400">{v.mine_state}</p>
                  </td>
                  <td>
                    <p className="text-sm font-medium">{v.type}</p>
                    <p className="text-[11px] text-coal-400">{v.category}</p>
                  </td>
                  <td><Badge color={SEVERITY_BADGE[v.severity]}>{v.severity}</Badge></td>
                  <td><Badge color={STATUS_BADGE[v.status]} dot>{v.status.replace('_', ' ')}</Badge></td>
                  <td><span className="text-sm font-semibold">{formatCurrency(v.fine_amount)}</span></td>
                  <td><span className="text-xs text-coal-500">{formatDate(v.detected_date)}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setViewItem(v)} className="p-1.5 rounded hover:bg-coal-100 text-coal-500"><FiEye size={15} /></button>
                      {canCreate && v.status !== 'closed' && (
                        <button onClick={() => { setEditItem(v); setShowForm(true); }} className="p-1.5 rounded hover:bg-coal-100 text-coal-500"><FiEdit2 size={15} /></button>
                      )}
                      {canDelete && <button onClick={() => setDeleteId(v.id)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><FiTrash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Modal */}
      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title={`Violation ${viewItem?.violation_number}`} size="md">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge color={SEVERITY_BADGE[viewItem.severity]}>{viewItem.severity}</Badge>
              <Badge color={STATUS_BADGE[viewItem.status]}>{viewItem.status.replace('_', ' ')}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-coal-400 text-xs">Mine</p><p className="font-medium">{viewItem.mine_name}</p></div>
              <div><p className="text-coal-400 text-xs">Category</p><p className="font-medium">{viewItem.category}</p></div>
              <div><p className="text-coal-400 text-xs">Type</p><p className="font-medium">{viewItem.type}</p></div>
              <div><p className="text-coal-400 text-xs">Fine Amount</p><p className="font-semibold text-red-600">{formatCurrency(viewItem.fine_amount)}</p></div>
              <div><p className="text-coal-400 text-xs">Detected Date</p><p>{formatDate(viewItem.detected_date)}</p></div>
              <div><p className="text-coal-400 text-xs">Regulation</p><p className="font-mono text-xs">{viewItem.regulation_reference || '—'}</p></div>
            </div>
            <div><p className="text-coal-400 text-xs mb-1">Description</p><p className="text-sm bg-coal-50 rounded-lg p-3">{viewItem.description}</p></div>
            {viewItem.corrective_action && (
              <div><p className="text-coal-400 text-xs mb-1">Corrective Action</p><p className="text-sm bg-green-50 rounded-lg p-3">{viewItem.corrective_action}</p></div>
            )}
            {viewItem.status !== 'closed' && canCreate && (
              <div className="flex gap-2 pt-2 border-t border-coal-100">
                {viewItem.status === 'open' && <button onClick={() => { handleStatusUpdate(viewItem.id, 'under_review'); setViewItem(null); }} className="btn-outline btn-sm">Mark Under Review</button>}
                {viewItem.status === 'under_review' && <button onClick={() => { handleStatusUpdate(viewItem.id, 'action_taken'); setViewItem(null); }} className="btn-primary btn-sm">Mark Action Taken</button>}
                {viewItem.status === 'action_taken' && <button onClick={() => { handleStatusUpdate(viewItem.id, 'closed'); setViewItem(null); }} className="btn-primary btn-sm bg-green-600 hover:bg-green-700">Close Violation</button>}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Violation' : 'Report New Violation'} size="lg">
        <ViolationForm violation={editItem} mines={mines} onSave={() => { setShowForm(false); setEditItem(null); fetch(); }} onCancel={() => { setShowForm(false); setEditItem(null); }} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Violation" message="Are you sure you want to delete this violation? This action cannot be undone." confirmText="Delete" danger />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiFilter, FiMapPin, FiEye, FiEdit2, FiMap } from 'react-icons/fi';
import { minesApi } from '../../services/api';
import { formatDate, formatMT, scoreToColor, getStatusColor } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import ScoreBar from '../../components/ui/ScoreBar';
import Modal from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import MineForm from './MineForm';
import MineMap from './MineMap';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function Mines() {
  const { user } = useAuthStore();
  const [mines, setMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('table'); // table | map
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editMine, setEditMine] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const canCreate = ['admin', 'government_officer'].includes(user?.role);
  const canEdit = ['admin', 'government_officer', 'mine_manager'].includes(user?.role);

  const fetchMines = async () => {
    setLoading(true);
    try {
      const res = await minesApi.getAll({ search, status: statusFilter, state: stateFilter, page, limit: 15 });
      setMines(res.data);
      setPagination(res.pagination);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchMines(); }, [search, statusFilter, stateFilter, page]);

  const handleSave = () => { setShowForm(false); setEditMine(null); fetchMines(); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Mine Management</h1>
          <p className="page-subtitle">Monitor and manage all registered coal mines</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(view === 'table' ? 'map' : 'table')} className="btn-outline">
            {view === 'table' ? <><FiMap size={16} /> GIS Map</> : <><FiFilter size={16} /> Table View</>}
          </button>
          {canCreate && <button onClick={() => setShowForm(true)} className="btn-primary"><FiPlus size={16} /> Add Mine</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-coal-400" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" placeholder="Search mines, companies..." />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-40">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="under_inspection">Under Inspection</option>
          <option value="inactive">Inactive</option>
          <option value="closed">Closed</option>
        </select>
        <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="select w-48">
          <option value="">All States</option>
          {['Jharkhand','Chhattisgarh','Odisha','West Bengal','Madhya Pradesh','Telangana','Maharashtra','Bihar'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Map view */}
      {view === 'map' && (
        <div className="card p-0 overflow-hidden" style={{ height: '520px' }}>
          <MineMap mines={mines} />
        </div>
      )}

      {/* Table view */}
      {view === 'table' && (
        <>
          {loading ? <PageLoader /> : mines.length === 0 ? (
            <EmptyState icon={FiMapPin} title="No mines found" message="Try adjusting your search or filters." action={canCreate && <button onClick={() => setShowForm(true)} className="btn-primary">Add First Mine</button>} />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mine</th>
                    <th>Type / State</th>
                    <th>Status</th>
                    <th>Compliance</th>
                    <th>Risk</th>
                    <th>License Expiry</th>
                    <th>Workers</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mines.map(mine => (
                    <tr key={mine.id}>
                      <td>
                        <div>
                          <p className="font-semibold text-coal-900">{mine.name}</p>
                          <p className="text-[11px] text-coal-400">{mine.mine_id} · {mine.owner_company}</p>
                        </div>
                      </td>
                      <td>
                        <Badge color={mine.type === 'Underground' ? 'blue' : 'green'}>{mine.type}</Badge>
                        <p className="text-[11px] text-coal-400 mt-0.5">{mine.state}</p>
                      </td>
                      <td>
                        <Badge color={getStatusColor(mine.status)} dot>{mine.status.replace('_', ' ')}</Badge>
                      </td>
                      <td>
                        <div className="w-24">
                          <span className={clsx('text-xs font-bold', scoreToColor(mine.compliance_score))}>{parseFloat(mine.compliance_score).toFixed(1)}%</span>
                          <ScoreBar score={mine.compliance_score} showLabel={false} height="h-1.5" />
                        </div>
                      </td>
                      <td>
                        <div className="w-20">
                          <span className={clsx('text-xs font-bold', scoreToColor(100 - mine.risk_score))}>{parseFloat(mine.risk_score).toFixed(1)}%</span>
                          <div className="w-full bg-coal-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div className={clsx('h-full rounded-full', parseFloat(mine.risk_score) >= 70 ? 'bg-red-500' : parseFloat(mine.risk_score) >= 40 ? 'bg-yellow-500' : 'bg-green-500')} style={{ width: `${mine.risk_score}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={clsx('text-xs', new Date(mine.license_expiry) < new Date() ? 'text-red-600 font-bold' : new Date(mine.license_expiry) < new Date(Date.now() + 90*24*60*60*1000) ? 'text-yellow-600 font-medium' : 'text-coal-600')}>
                          {formatDate(mine.license_expiry)}
                        </span>
                      </td>
                      <td><span className="text-sm font-medium">{mine.workers_count?.toLocaleString()}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link to={`/mines/${mine.id}`} className="p-1.5 rounded hover:bg-coal-100 text-coal-500 transition-colors" title="View Detail"><FiEye size={15} /></Link>
                          {canEdit && <button onClick={() => { setEditMine(mine); setShowForm(true); }} className="p-1.5 rounded hover:bg-coal-100 text-coal-500 transition-colors" title="Edit"><FiEdit2 size={15} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-coal-500">Showing {mines.length} of {pagination.total} mines</p>
              <div className="flex gap-1">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={clsx('w-8 h-8 rounded text-xs font-medium', p === page ? 'bg-primary-600 text-white' : 'bg-white border border-coal-200 text-coal-600 hover:bg-coal-50')}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditMine(null); }} title={editMine ? 'Edit Mine' : 'Add New Mine'} size="lg">
        <MineForm mine={editMine} onSave={handleSave} onCancel={() => { setShowForm(false); setEditMine(null); }} />
      </Modal>
    </div>
  );
}

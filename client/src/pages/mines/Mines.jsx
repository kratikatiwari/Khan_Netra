import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiSearch, FiMapPin, FiEye, FiEdit2, FiMap, FiList, FiFilter } from 'react-icons/fi';
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
import clsx from 'clsx';

const STATUS_SUMMARY_COLORS = {
  active:           'bg-success-600/15 border-success-500/25 text-success-400',
  suspended:        'bg-danger-600/15  border-danger-500/25  text-danger-400',
  under_inspection: 'bg-amber-500/15   border-amber-500/25   text-amber-400',
  inactive:         'bg-coal-700/40    border-coal-600/40    text-coal-500',
};

export default function Mines() {
  const { user } = useAuthStore();
  const [mines,      setMines]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState('table');
  const [search,     setSearch]     = useState('');
  const [statusF,    setStatusF]    = useState('');
  const [stateF,     setStateF]     = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [editMine,   setEditMine]   = useState(null);
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({});

  const canCreate = ['admin','government_officer'].includes(user?.role);
  const canEdit   = ['admin','government_officer','mine_manager'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const r = await minesApi.getAll({ search, status: statusF, state: stateF, page, limit: 15 });
      setMines(r.data); setPagination(r.pagination);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, statusF, stateF, page]);

  const handleSave = () => { setShowForm(false); setEditMine(null); load(); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FiMapPin className="text-amber-400" /> Mine Management
          </h1>
          <p className="page-subtitle">Monitor and manage all registered coal mines across India</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-coal-800 border border-coal-700/60 rounded-xl p-1 gap-0.5">
            <button onClick={() => setView('table')}
              className={clsx('p-2 rounded-lg transition-all', view==='table' ? 'bg-amber-500/20 text-amber-400' : 'text-coal-600 hover:text-coal-300')}>
              <FiList size={16}/>
            </button>
            <button onClick={() => setView('map')}
              className={clsx('p-2 rounded-lg transition-all', view==='map' ? 'bg-amber-500/20 text-amber-400' : 'text-coal-600 hover:text-coal-300')}>
              <FiMap size={16}/>
            </button>
          </div>
          {canCreate && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <FiPlus size={15}/> Add Mine
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card-sm flex flex-wrap gap-3">
        <div className="flex-1 min-w-52 relative">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-coal-600" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9 text-sm" placeholder="Search mines, companies, ID…" />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="select w-40">
          <option value="">All Status</option>
          {['active','suspended','under_inspection','inactive','closed'].map(s => (
            <option key={s} value={s}>{s.replace('_',' ')}</option>
          ))}
        </select>
        <select value={stateF} onChange={e => setStateF(e.target.value)} className="select w-48">
          <option value="">All States</option>
          {['Jharkhand','Chhattisgarh','Odisha','West Bengal','Madhya Pradesh','Telangana','Maharashtra','Bihar'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Map */}
      {view === 'map' && (
        <div className="card p-0 overflow-hidden border border-coal-700/60" style={{ height:'520px' }}>
          <MineMap mines={mines} />
        </div>
      )}

      {/* Table */}
      {view === 'table' && (
        <>
          {loading ? <PageLoader /> : mines.length === 0 ? (
            <EmptyState icon={FiMapPin} title="No mines found"
              message="Try adjusting your search or filters."
              action={canCreate && <button onClick={() => setShowForm(true)} className="btn-primary">Add First Mine</button>}
            />
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
                  {mines.map(mine => {
                    const licExpired = mine.license_expiry && new Date(mine.license_expiry) < new Date();
                    const licSoon    = !licExpired && mine.license_expiry && new Date(mine.license_expiry) < new Date(Date.now() + 90*864e5);
                    return (
                      <tr key={mine.id}>
                        <td>
                          <div>
                            <p className="font-bold text-coal-100">{mine.name}</p>
                            <p className="text-[11px] text-coal-600 font-mono mt-0.5">{mine.mine_id} · {mine.owner_company}</p>
                          </div>
                        </td>
                        <td>
                          <Badge color={mine.type==='Underground'?'blue':'green'}>{mine.type}</Badge>
                          <p className="text-[11px] text-coal-600 mt-1">{mine.state}</p>
                        </td>
                        <td>
                          <Badge color={getStatusColor(mine.status)} dot>
                            {mine.status.replace(/_/g,' ')}
                          </Badge>
                        </td>
                        <td>
                          <div className="w-24">
                            <span className={clsx('text-xs font-bold', scoreToColor(mine.compliance_score))}>
                              {parseFloat(mine.compliance_score).toFixed(1)}%
                            </span>
                            <ScoreBar score={mine.compliance_score} showLabel={false} height="h-1.5" />
                          </div>
                        </td>
                        <td>
                          <div className="w-20">
                            <span className={clsx('text-xs font-bold',
                              parseFloat(mine.risk_score)>=70?'text-danger-400':parseFloat(mine.risk_score)>=40?'text-amber-400':'text-success-400')}>
                              {parseFloat(mine.risk_score).toFixed(1)}%
                            </span>
                            <div className="score-bar-track mt-1">
                              <div className={clsx('score-bar-fill', parseFloat(mine.risk_score)>=70?'bg-danger-500':parseFloat(mine.risk_score)>=40?'bg-amber-500':'bg-success-500')}
                                style={{ width:`${mine.risk_score}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={clsx('text-xs font-semibold',
                            licExpired?'text-danger-400':licSoon?'text-amber-400':'text-coal-400')}>
                            {formatDate(mine.license_expiry)}
                            {licExpired && ' ⛔'}
                            {licSoon && !licExpired && ' ⚠️'}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm font-semibold text-coal-300">
                            {mine.workers_count?.toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Link to={`/mines/${mine.id}`}
                              className="p-1.5 rounded-lg text-coal-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="View">
                              <FiEye size={14}/>
                            </Link>
                            {canEdit && (
                              <button onClick={() => { setEditMine(mine); setShowForm(true); }}
                                className="p-1.5 rounded-lg text-coal-600 hover:text-info-400 hover:bg-info-500/10 transition-colors" title="Edit">
                                <FiEdit2 size={14}/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-coal-600">{mines.length} of {pagination.total} mines</p>
              <div className="flex gap-1.5">
                {Array.from({ length: pagination.pages }, (_, i) => i+1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={clsx('w-8 h-8 rounded-lg text-xs font-bold transition-all',
                      p===page ? 'bg-amber-500 text-coal-950' : 'bg-coal-800 border border-coal-700 text-coal-500 hover:text-coal-200')}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditMine(null); }}
        title={editMine ? 'Edit Mine' : 'Add New Mine'} size="lg">
        <MineForm mine={editMine} onSave={handleSave} onCancel={() => { setShowForm(false); setEditMine(null); }} />
      </Modal>
    </div>
  );
}

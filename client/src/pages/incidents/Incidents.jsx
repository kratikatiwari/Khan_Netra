import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPlus, FiSearch, FiAlertTriangle, FiEye, FiEdit2 } from 'react-icons/fi';
import { incidentsApi, minesApi } from '../../services/api';
import { formatDateTime, formatDate } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import IncidentForm from './IncidentForm';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const SEV_COLOR = { fatal: 'red', serious: 'yellow', minor: 'blue', near_miss: 'gray' };

export default function Incidents() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [incidents, setIncidents] = useState([]);
  const [mines, setMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ severity: '', status: '', mine_id: searchParams.get('mine_id') || '' });
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await incidentsApi.getAll({ ...filters, page, limit: 15 });
      setIncidents(res.data);
      setPagination(res.pagination);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filters, page]);
  useEffect(() => { minesApi.getAll({ limit: 100 }).then(r => setMines(r.data)).catch(() => {}); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Incidents & Safety</h1>
          <p className="page-subtitle">Monitor accidents, incidents and safety events</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><FiPlus size={16} /> Report Incident</button>
      </div>

      {/* Severity quick filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'fatal', 'serious', 'minor', 'near_miss'].map(s => (
          <button key={s} onClick={() => setFilters(p => ({ ...p, severity: s }))}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              filters.severity === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-coal-600 border-coal-200 hover:bg-coal-50')}>
            {s === '' ? 'All' : s.replace('_',' ').replace(/^\w/, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.mine_id} onChange={e => setFilters(p => ({ ...p, mine_id: e.target.value }))} className="select w-48">
          <option value="">All Mines</option>
          {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="select w-44">
          <option value="">All Status</option>
          {['open','under_investigation','closed','reported_to_dgms'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : incidents.length === 0 ? (
        <EmptyState icon={FiAlertTriangle} title="No incidents found" />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Incident #</th>
                <th>Mine</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Injuries / Fatalities</th>
                <th>DGMS Notified</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id}>
                  <td><span className="font-mono text-xs font-bold">{inc.incident_number}</span></td>
                  <td>
                    <p className="font-medium">{inc.mine_name}</p>
                    <p className="text-[11px] text-coal-400">{inc.state}</p>
                  </td>
                  <td><span className="text-sm">{inc.type}</span></td>
                  <td><Badge color={SEV_COLOR[inc.severity]}>{inc.severity.replace('_',' ')}</Badge></td>
                  <td>
                    <span className={clsx('text-sm font-semibold', parseInt(inc.fatalities_count) > 0 ? 'text-red-600' : 'text-coal-700')}>
                      {inc.injuries_count} inj. / {inc.fatalities_count} fatal
                    </span>
                  </td>
                  <td>
                    <Badge color={inc.dgms_notified ? 'green' : 'gray'}>{inc.dgms_notified ? 'Yes' : 'No'}</Badge>
                  </td>
                  <td><Badge color={inc.status === 'closed' ? 'green' : inc.status === 'open' ? 'red' : 'yellow'} dot>{inc.status.replace(/_/g,' ')}</Badge></td>
                  <td><span className="text-xs text-coal-500">{formatDate(inc.incident_date)}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setViewItem(inc)} className="p-1.5 rounded hover:bg-coal-100 text-coal-500"><FiEye size={15} /></button>
                      {inc.status !== 'closed' && <button onClick={() => { setEditItem(inc); setShowForm(true); }} className="p-1.5 rounded hover:bg-coal-100 text-coal-500"><FiEdit2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Modal */}
      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title={`Incident ${viewItem?.incident_number}`} size="md">
        {viewItem && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge color={SEV_COLOR[viewItem.severity]}>{viewItem.severity}</Badge>
              <Badge color={viewItem.status === 'closed' ? 'green' : 'red'} dot>{viewItem.status.replace(/_/g,' ')}</Badge>
              {viewItem.dgms_notified && <Badge color="blue">DGMS Notified</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-coal-400">Mine</p><p className="font-medium">{viewItem.mine_name}</p></div>
              <div><p className="text-xs text-coal-400">Type</p><p className="font-medium">{viewItem.type}</p></div>
              <div><p className="text-xs text-coal-400">Category</p><p>{viewItem.category}</p></div>
              <div><p className="text-xs text-coal-400">Date & Time</p><p>{formatDateTime(viewItem.incident_date)}</p></div>
              <div><p className="text-xs text-coal-400">Location</p><p>{viewItem.location_in_mine || '—'}</p></div>
              <div>
                <p className="text-xs text-coal-400">Casualties</p>
                <p className={clsx('font-semibold', parseInt(viewItem.fatalities_count) > 0 ? 'text-red-600' : 'text-coal-700')}>
                  {viewItem.injuries_count} Injured · {viewItem.fatalities_count} Fatal
                </p>
              </div>
            </div>
            <div><p className="text-xs text-coal-400 mb-1">Description</p><p className="text-sm bg-coal-50 rounded-lg p-3">{viewItem.description}</p></div>
            {viewItem.root_cause && <div><p className="text-xs text-coal-400 mb-1">Root Cause</p><p className="text-sm bg-yellow-50 rounded-lg p-3">{viewItem.root_cause}</p></div>}
            {viewItem.corrective_measures && <div><p className="text-xs text-coal-400 mb-1">Corrective Measures</p><p className="text-sm bg-green-50 rounded-lg p-3">{viewItem.corrective_measures}</p></div>}
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Update Incident' : 'Report Incident'} size="lg">
        <IncidentForm incident={editItem} mines={mines} onSave={() => { setShowForm(false); setEditItem(null); fetch(); }} onCancel={() => { setShowForm(false); setEditItem(null); }} />
      </Modal>
    </div>
  );
}

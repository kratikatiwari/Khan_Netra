import { useState, useEffect } from 'react';
import { FiBook, FiSearch, FiDownload } from 'react-icons/fi';
import { analyticsApi, reportsApi } from '../../services/api';
import { formatDateTime, downloadBlob } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const ACTION_COLOR = { CREATE: 'green', UPDATE: 'blue', DELETE: 'red', LOGIN: 'gray', VIEW: 'gray', UPLOAD: 'purple' };

export default function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ action: '', entity_type: '' });

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.getAuditLogs({ ...filters, page, limit: 30 });
      setLogs(res.data);
      setPagination(res.pagination);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filters, page]);

  const downloadExcel = async () => {
    try {
      const res = await reportsApi.downloadExcel({ type: 'violations' });
      downloadBlob(res, 'KhanNetra-Export.xlsx');
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><FiBook className="text-primary-600" /> Audit Trail</h1>
          <p className="page-subtitle">Complete log of all system actions and changes</p>
        </div>
        <button onClick={downloadExcel} className="btn-outline"><FiDownload size={16} /> Export Logs</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.action} onChange={e => setFilters(p => ({ ...p, action: e.target.value }))} className="select w-36">
          <option value="">All Actions</option>
          {['CREATE','UPDATE','DELETE','LOGIN','VIEW','UPLOAD'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filters.entity_type} onChange={e => setFilters(p => ({ ...p, entity_type: e.target.value }))} className="select w-40">
          <option value="">All Entities</option>
          {['mine','violation','incident','inspection','document','user','auth','compliance','analytics'].map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : logs.length === 0 ? (
        <EmptyState icon={FiBook} title="No audit logs found" />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Description</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td><span className="text-xs text-coal-500 whitespace-nowrap">{formatDateTime(log.created_at)}</span></td>
                  <td>
                    <p className="text-sm font-medium">{log.full_name || 'System'}</p>
                    <p className="text-[11px] text-coal-400">{log.mine_name || ''}</p>
                  </td>
                  <td>
                    {log.role && <Badge color="gray" className="text-[10px]">{log.role.replace('_',' ')}</Badge>}
                  </td>
                  <td><Badge color={ACTION_COLOR[log.action] || 'gray'}>{log.action}</Badge></td>
                  <td><span className="text-xs font-medium capitalize">{log.entity_type}</span></td>
                  <td><span className="text-xs text-coal-600">{log.description}</span></td>
                  <td><span className="font-mono text-xs text-coal-400">{log.ip_address}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-coal-500">Page {page} of {pagination.pages} · {pagination.total} records</p>
          <div className="flex gap-1">
            {page > 1 && <button onClick={() => setPage(p => p - 1)} className="btn-outline btn-sm">← Prev</button>}
            {page < pagination.pages && <button onClick={() => setPage(p => p + 1)} className="btn-outline btn-sm">Next →</button>}
          </div>
        </div>
      )}
    </div>
  );
}

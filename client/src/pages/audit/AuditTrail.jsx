import { useState, useEffect } from 'react';
import { FiBook, FiDownload } from 'react-icons/fi';
import { analyticsApi, reportsApi } from '../../services/api';
import { formatDateTime, downloadBlob } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import clsx from 'clsx';

const ACTION_COLOR = { CREATE:'green', UPDATE:'blue', DELETE:'red', LOGIN:'gray', VIEW:'gray', UPLOAD:'purple' };
const ACTION_BG    = {
  CREATE:'bg-success-600/15 text-success-400', UPDATE:'bg-info-600/15 text-info-400',
  DELETE:'bg-danger-600/15 text-danger-400',   LOGIN:'bg-coal-700 text-coal-500',
  VIEW:'bg-coal-700 text-coal-500',            UPLOAD:'bg-purple-600/15 text-purple-400',
};

export default function AuditTrail() {
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [pagination, setPagination] = useState({});
  const [page,       setPage]       = useState(1);
  const [filters,    setFilters]    = useState({ action:'', entity_type:'' });

  const load = async () => {
    setLoading(true);
    try {
      const r = await analyticsApi.getAuditLogs({ ...filters, page, limit:30 });
      setLogs(r.data); setPagination(r.pagination);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters, page]);

  const dlExcel = async () => {
    try { const r = await reportsApi.downloadExcel({ type:'violations' }); downloadBlob(r,'KhanNetra-Audit-Export.xlsx'); }
    catch {}
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><FiBook className="text-amber-400"/> Audit Trail</h1>
          <p className="page-subtitle">Complete tamper-evident log of all system actions</p>
        </div>
        <button onClick={dlExcel} className="btn-outline btn-sm"><FiDownload size={14}/> Export</button>
      </div>

      <div className="card-sm flex flex-wrap gap-3">
        <select value={filters.action} onChange={e=>setFilters(p=>({...p,action:e.target.value}))} className="select w-36">
          <option value="">All Actions</option>
          {['CREATE','UPDATE','DELETE','LOGIN','VIEW','UPLOAD'].map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filters.entity_type} onChange={e=>setFilters(p=>({...p,entity_type:e.target.value}))} className="select w-40">
          <option value="">All Entities</option>
          {['mine','violation','incident','inspection','document','user','auth','compliance'].map(e=><option key={e} value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <PageLoader/> : logs.length===0 ? (
        <EmptyState icon={FiBook} title="No audit logs found"/>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Entity</th><th>Description</th><th>IP</th></tr></thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td><span className="text-[11px] text-coal-600 font-mono whitespace-nowrap">{formatDateTime(log.created_at)}</span></td>
                  <td>
                    <p className="text-sm font-semibold text-coal-200">{log.full_name||'System'}</p>
                    <p className="text-[11px] text-coal-600">{log.mine_name||''}</p>
                  </td>
                  <td>{log.role && <Badge color="gray">{log.role.replace('_',' ')}</Badge>}</td>
                  <td>
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold', ACTION_BG[log.action]||ACTION_BG.VIEW)}>
                      {log.action}
                    </span>
                  </td>
                  <td><span className="text-xs font-semibold text-coal-400 capitalize">{log.entity_type}</span></td>
                  <td><span className="text-xs text-coal-500">{log.description}</span></td>
                  <td><span className="font-mono text-[11px] text-coal-700">{log.ip_address}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-coal-600">Page {page} of {pagination.pages} · {pagination.total} records</p>
          <div className="flex gap-1.5">
            {page>1 && <button onClick={() => setPage(p=>p-1)} className="btn-outline btn-sm">← Prev</button>}
            {page<pagination.pages && <button onClick={() => setPage(p=>p+1)} className="btn-primary btn-sm">Next →</button>}
          </div>
        </div>
      )}
    </div>
  );
}

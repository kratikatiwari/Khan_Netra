import { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiTrash2, FiFilter } from 'react-icons/fi';
import { notificationsApi } from '../../services/api';
import { timeAgo } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TYPE_COLOR = { alert: 'red', warning: 'yellow', info: 'blue', success: 'green', deadline: 'purple', violation: 'orange', incident: 'red' };
const TYPE_BG = { alert: 'bg-red-50 border-l-red-500', warning: 'bg-yellow-50 border-l-yellow-500', info: 'bg-blue-50 border-l-blue-500', success: 'bg-green-50 border-l-green-500', deadline: 'bg-purple-50 border-l-purple-500', violation: 'bg-orange-50 border-l-orange-500', incident: 'bg-red-50 border-l-red-500' };

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);

  const fetch = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...(filter === 'unread' ? { is_read: false } : filter === 'read' ? { is_read: true } : {}) };
      const res = await notificationsApi.getAll(params);
      setNotifs(res.data);
      setPagination(res.pagination);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filter, page]);

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      toast.success('All notifications marked as read');
      fetch();
    } catch {}
  };

  const deleteNotif = async (id) => {
    try {
      await notificationsApi.delete(id);
      setNotifs(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FiBell className="text-primary-600" /> Notifications
            {unreadCount > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{unreadCount}</span>}
          </h1>
          <p className="page-subtitle">System alerts, compliance deadlines and incident notifications</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-outline btn-sm"><FiCheck size={14} /> Mark All Read</button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'unread', 'read'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize', filter === f ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-coal-600 border-coal-200 hover:bg-coal-50')}>
            {f}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : notifs.length === 0 ? (
        <EmptyState icon={FiBell} title="No notifications" message="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n.id} className={clsx('flex items-start gap-4 p-4 rounded-xl border-l-4 transition-all',
              TYPE_BG[n.type] || 'bg-coal-50 border-l-coal-300',
              !n.is_read && 'shadow-sm'
            )}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm text-coal-900">{n.title}</span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                  <Badge color={TYPE_COLOR[n.type] || 'gray'}>{n.type}</Badge>
                  {n.mine_name && <span className="text-xs text-coal-400">· {n.mine_name}</span>}
                </div>
                <p className="text-sm text-coal-600">{n.message}</p>
                <p className="text-xs text-coal-400 mt-1">{timeAgo(n.created_at)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors" title="Mark read"><FiCheck size={15} /></button>
                )}
                <button onClick={() => deleteNotif(n.id)} className="p-1.5 rounded hover:bg-red-100 text-red-400 transition-colors" title="Delete"><FiTrash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={clsx('w-8 h-8 rounded text-xs font-medium', p === page ? 'bg-primary-600 text-white' : 'bg-white border border-coal-200 text-coal-600')}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

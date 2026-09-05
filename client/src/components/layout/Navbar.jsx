import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMenu, FiBell, FiUser, FiLogOut, FiSettings, FiChevronDown } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import { notificationsApi } from '../../services/api';
import { timeAgo } from '../../utils/helpers';
import Badge from '../ui/Badge';
import clsx from 'clsx';

export default function Navbar({ onMenuToggle, sidebarCollapsed }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifsRef = useRef();
  const profileRef = useRef();

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnread = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnread(res.data.count);
    } catch {}
  };

  const loadNotifications = async () => {
    try {
      const res = await notificationsApi.getAll({ limit: 8, is_read: false });
      setNotifs(res.data);
    } catch {}
  };

  useEffect(() => {
    if (showNotifs) loadNotifications();
  }, [showNotifs]);

  // Click outside
  useEffect(() => {
    const handler = (e) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const notifColors = { alert: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-blue-500', success: 'bg-green-500', incident: 'bg-red-500', violation: 'bg-orange-500', deadline: 'bg-purple-500' };

  return (
    <header className="h-16 bg-white border-b border-coal-200 flex items-center justify-between px-4 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-coal-100 text-coal-600 transition-colors">
          <FiMenu size={20} />
        </button>
        <div className="hidden md:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-coal-500 font-medium">System Active</span>
          <span className="text-coal-300">|</span>
          <span className="text-xs text-coal-500">DGMS KhanNetra v1.0</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div ref={notifsRef} className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg hover:bg-coal-100 text-coal-600 transition-colors"
          >
            <FiBell size={20} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-coal-200 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-coal-100">
                <span className="font-semibold text-sm text-coal-800">Notifications</span>
                <Link to="/notifications" className="text-xs text-primary-600 hover:underline" onClick={() => setShowNotifs(false)}>View All</Link>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="text-center py-8 text-coal-400 text-sm">No unread notifications</div>
                ) : (
                  notifs.map(n => (
                    <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-coal-50 border-b border-coal-50 cursor-pointer" onClick={() => setShowNotifs(false)}>
                      <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', notifColors[n.type] || 'bg-gray-400')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-coal-800 truncate">{n.title}</p>
                        <p className="text-xs text-coal-500 truncate">{n.message}</p>
                        <p className="text-[10px] text-coal-400 mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-coal-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.full_name?.[0] || 'U'}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-coal-800 leading-none">{user?.full_name}</p>
              <p className="text-[10px] text-coal-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <FiChevronDown size={14} className="text-coal-400 hidden md:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-2xl border border-coal-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-coal-100 bg-coal-50">
                <p className="text-sm font-semibold text-coal-800">{user?.full_name}</p>
                <p className="text-xs text-coal-500">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link to="/profile" onClick={() => setShowProfile(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-coal-700 hover:bg-coal-50 transition-colors">
                  <FiUser size={16} /> My Profile
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <FiLogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

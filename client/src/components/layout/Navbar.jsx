import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiMenu, FiBell, FiUser, FiLogOut, FiSettings,
  FiChevronDown, FiAlertTriangle, FiInfo, FiAlertCircle,
} from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import { notificationsApi } from '../../services/api';
import { timeAgo } from '../../utils/helpers';
import clsx from 'clsx';

const TYPE_ICON = {
  alert:     <FiAlertTriangle size={13} className="text-danger-400" />,
  incident:  <FiAlertTriangle size={13} className="text-danger-400" />,
  violation: <FiAlertCircle  size={13} className="text-safety-400" />,
  warning:   <FiAlertTriangle size={13} className="text-amber-400" />,
  deadline:  <FiAlertCircle  size={13} className="text-amber-400" />,
  info:      <FiInfo          size={13} className="text-info-400" />,
  success:   <FiInfo          size={13} className="text-success-400" />,
};

const TYPE_DOT = {
  alert:    'bg-danger-500', incident: 'bg-danger-500', violation: 'bg-safety-500',
  warning:  'bg-amber-500',  deadline: 'bg-amber-500',
  info:     'bg-info-500',   success:  'bg-success-500',
};

const ROLE_LABEL = {
  admin: 'Administrator', government_officer: 'Govt. Officer',
  mine_manager: 'Mine Manager', inspector: 'DGMS Inspector',
  safety_officer: 'Safety Officer', environment_officer: 'Env. Officer',
};

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [notifs,       setNotifs]       = useState([]);
  const [unread,       setUnread]       = useState(0);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  const [loadingNotifs,setLoadingNotifs]= useState(false);
  const notifsRef  = useRef();
  const profileRef = useRef();

  useEffect(() => {
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (notifsRef.current  && !notifsRef.current.contains(e.target))  setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const fetchCount = async () => {
    try { const r = await notificationsApi.getUnreadCount(); setUnread(r.data.count); } catch {}
  };

  const openNotifs = async () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      setLoadingNotifs(true);
      try { const r = await notificationsApi.getAll({ limit: 8, is_read: false }); setNotifs(r.data); }
      catch {} finally { setLoadingNotifs(false); }
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="h-14 bg-coal-900/95 backdrop-blur-md border-b border-coal-700/50 flex items-center justify-between px-4 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle}
          className="p-2 rounded-lg text-coal-500 hover:text-coal-200 hover:bg-coal-800 transition-colors">
          <FiMenu size={18} />
        </button>
        <div className="hidden md:flex items-center gap-2">
          <span className="status-dot-green" />
          <span className="text-[11px] text-coal-500 font-medium">System Online</span>
          <span className="text-coal-700 mx-1">|</span>
          <span className="text-[11px] text-coal-600">KhanNetra v1.0 · DGMS</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">

        {/* Notifications */}
        <div ref={notifsRef} className="relative">
          <button onClick={openNotifs}
            className="relative p-2 rounded-lg text-coal-500 hover:text-coal-200 hover:bg-coal-800 transition-colors">
            <FiBell size={18} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-danger-500 rounded-full text-white text-[9px] flex items-center justify-center font-black shadow-[0_0_6px_rgba(239,68,68,.6)]">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-11 w-80 bg-coal-900 rounded-2xl border border-coal-700/60 shadow-panel z-50 overflow-hidden animate-slide-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-coal-700/50">
                <span className="text-sm font-bold text-coal-200">Notifications</span>
                <Link to="/notifications" onClick={() => setShowNotifs(false)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold">
                  View All
                </Link>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loadingNotifs ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-coal-700 border-t-amber-400 rounded-full animate-spin" />
                  </div>
                ) : notifs.length === 0 ? (
                  <p className="text-center py-8 text-coal-600 text-sm">All caught up!</p>
                ) : notifs.map(n => (
                  <Link to="/notifications" key={n.id}
                    onClick={() => setShowNotifs(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-coal-800/50 border-b border-coal-800 transition-colors last:border-0">
                    <div className={clsx('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', TYPE_DOT[n.type] || 'bg-coal-600')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-coal-200 truncate">{n.title}</p>
                      <p className="text-[11px] text-coal-500 truncate mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-coal-700 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-coal-800 transition-colors">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <span className="text-amber-400 text-xs font-black">{user?.full_name?.[0] || 'U'}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-coal-200 leading-none">{user?.full_name?.split(' ')[0]}</p>
              <p className="text-[10px] text-coal-500 leading-none mt-0.5">{ROLE_LABEL[user?.role] || user?.role}</p>
            </div>
            <FiChevronDown size={12} className="text-coal-600 hidden md:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-11 w-52 bg-coal-900 rounded-2xl border border-coal-700/60 shadow-panel z-50 overflow-hidden animate-slide-up">
              <div className="px-4 py-3 border-b border-coal-700/50">
                <p className="text-sm font-bold text-coal-100">{user?.full_name}</p>
                <p className="text-[11px] text-coal-500 mt-0.5">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link to="/profile" onClick={() => setShowProfile(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-coal-400 hover:text-coal-100 hover:bg-coal-800/60 transition-colors">
                  <FiUser size={15} /> My Profile
                </Link>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger-400 hover:text-danger-300 hover:bg-danger-600/10 transition-colors">
                  <FiLogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

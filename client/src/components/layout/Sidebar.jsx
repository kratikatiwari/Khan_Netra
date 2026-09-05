import { NavLink, useLocation } from 'react-router-dom';
import { FiHome, FiMapPin, FiAlertTriangle, FiAlertCircle, FiWind, FiClipboard, FiFileText, FiShield, FiBarChart2, FiMessageSquare, FiUsers, FiSettings, FiBook, FiActivity, FiBookOpen, FiCpu, FiBell } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import clsx from 'clsx';

const navSections = [
  {
    title: 'Overview',
    links: [
      { to: '/dashboard', icon: FiHome, label: 'Dashboard' },
      { to: '/analytics', icon: FiBarChart2, label: 'Analytics' },
    ]
  },
  {
    title: 'Mine Management',
    links: [
      { to: '/mines', icon: FiMapPin, label: 'Mines & GIS Map' },
      { to: '/compliance', icon: FiShield, label: 'Compliance Monitor' },
    ]
  },
  {
    title: 'Safety & Environment',
    links: [
      { to: '/incidents', icon: FiAlertTriangle, label: 'Incidents & Safety' },
      { to: '/environment', icon: FiWind, label: 'Environment Monitor' },
      { to: '/violations', icon: FiAlertCircle, label: 'Violations' },
    ]
  },
  {
    title: 'Operations',
    links: [
      { to: '/inspections', icon: FiClipboard, label: 'Inspections' },
      { to: '/documents', icon: FiFileText, label: 'Documents' },
      { to: '/reports', icon: FiActivity, label: 'Reports' },
    ]
  },
  {
    title: 'AI & Intelligence',
    links: [
      { to: '/ai/chat', icon: FiMessageSquare, label: 'AI Chatbot' },
      { to: '/ai/risk', icon: FiCpu, label: 'Risk Prediction' },
      { to: '/compliance/regulations', icon: FiBookOpen, label: 'Regulations' },
    ]
  },
  {
    title: 'Administration',
    links: [
      { to: '/notifications', icon: FiBell, label: 'Notifications', adminOnly: false },
      { to: '/audit', icon: FiBook, label: 'Audit Trail' },
      { to: '/users', icon: FiUsers, label: 'User Management', roles: ['admin', 'government_officer'] },
    ]
  }
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuthStore();
  const location = useLocation();

  const canShow = (link) => {
    if (link.roles && !link.roles.includes(user?.role)) return false;
    return true;
  };

  return (
    <aside className={clsx(
      'fixed left-0 top-0 h-screen bg-coal-900 flex flex-col transition-all duration-300 z-40 shrink-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-coal-700">
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
          <span className="text-white font-bold text-sm">KN</span>
        </div>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-lg leading-none">KhanNetra</div>
            <div className="text-coal-400 text-xs mt-0.5">DGMS | Min. of Coal</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navSections.map((section) => {
          const visibleLinks = section.links.filter(canShow);
          if (!visibleLinks.length) return null;
          return (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <p className="text-coal-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">{section.title}</p>
              )}
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    clsx('sidebar-link', isActive || location.pathname.startsWith(link.to + '/') ? 'active' : '')
                  }
                  title={collapsed ? link.label : undefined}
                >
                  <link.icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{link.label}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User info */}
      {!collapsed && (
        <div className="px-3 py-4 border-t border-coal-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{user?.full_name?.[0] || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.full_name}</p>
              <p className="text-coal-400 text-[10px] capitalize truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

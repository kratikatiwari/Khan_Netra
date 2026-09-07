import { NavLink, useLocation } from 'react-router-dom';
import {
  FiHome, FiMapPin, FiAlertTriangle, FiAlertCircle, FiWind,
  FiClipboard, FiFileText, FiShield, FiBarChart2, FiMessageSquare,
  FiUsers, FiBook, FiActivity, FiBookOpen, FiCpu, FiBell, FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import clsx from 'clsx';

const NAV = [
  {
    title: 'Overview',
    links: [
      { to: '/dashboard', icon: FiHome,       label: 'Dashboard'        },
      { to: '/analytics', icon: FiBarChart2,  label: 'Analytics'        },
    ],
  },
  {
    title: 'Mine Operations',
    links: [
      { to: '/mines',      icon: FiMapPin,   label: 'Mines & GIS Map'  },
      { to: '/compliance', icon: FiShield,   label: 'Compliance'       },
    ],
  },
  {
    title: 'Safety & Environment',
    links: [
      { to: '/incidents',   icon: FiAlertTriangle, label: 'Incidents'        },
      { to: '/environment', icon: FiWind,          label: 'Environment'      },
      { to: '/violations',  icon: FiAlertCircle,   label: 'Violations'       },
    ],
  },
  {
    title: 'Operations',
    links: [
      { to: '/inspections', icon: FiClipboard, label: 'Inspections'  },
      { to: '/documents',   icon: FiFileText,  label: 'Documents'    },
      { to: '/reports',     icon: FiActivity,  label: 'Reports'      },
    ],
  },
  {
    title: 'Intelligence',
    links: [
      { to: '/ai/chat',                 icon: FiMessageSquare, label: 'AI Assistant'   },
      { to: '/ai/risk',                 icon: FiCpu,           label: 'Risk Prediction'},
      { to: '/compliance/regulations',  icon: FiBookOpen,      label: 'Regulations'    },
    ],
  },
  {
    title: 'Administration',
    links: [
      { to: '/notifications', icon: FiBell,   label: 'Notifications'  },
      { to: '/audit',         icon: FiBook,   label: 'Audit Trail',   roles: ['admin','government_officer','inspector'] },
      { to: '/users',         icon: FiUsers,  label: 'User Management', roles: ['admin','government_officer'] },
    ],
  },
];

const ROLE_LABEL = {
  admin:               'Administrator',
  government_officer:  'Govt. Officer',
  mine_manager:        'Mine Manager',
  inspector:           'Inspector',
  safety_officer:      'Safety Officer',
  environment_officer: 'Env. Officer',
};

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuthStore();
  const location = useLocation();

  const canShow = (link) => {
    if (link.roles && !link.roles.includes(user?.role)) return false;
    return true;
  };

  return (
    <aside className={clsx(
      'fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-40',
      'bg-coal-900 border-r border-coal-700/50',
      collapsed ? 'w-16' : 'w-64',
    )}>
      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div className={clsx(
        'flex items-center gap-3 px-4 border-b border-coal-700/50',
        collapsed ? 'py-4 justify-center' : 'py-4',
      )}>
        {/* Logo mark */}
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,.4)]">
            <span className="text-coal-950 font-black text-sm leading-none">KN</span>
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success-500 border-2 border-coal-900" />
        </div>

        {!collapsed && (
          <div className="min-w-0">
            <p className="text-coal-50 font-black text-base leading-none tracking-tight">KhanNetra</p>
            <p className="text-coal-500 text-[10px] mt-0.5 truncate">DGMS · Ministry of Coal</p>
          </div>
        )}

        {!collapsed && (
          <button onClick={onToggle} className="ml-auto p-1 rounded-lg text-coal-600 hover:text-coal-300 hover:bg-coal-800 transition-colors">
            <FiChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {collapsed && (
          <button onClick={onToggle} className="w-full flex justify-center py-2 text-coal-600 hover:text-coal-300 hover:bg-coal-800 rounded-xl transition-colors mb-2">
            <FiChevronRight size={16} />
          </button>
        )}

        {NAV.map((section) => {
          const visible = section.links.filter(canShow);
          if (!visible.length) return null;
          return (
            <div key={section.title} className="mb-3">
              {!collapsed && (
                <p className="px-3 mb-1.5 text-[9px] font-black text-coal-700 uppercase tracking-[.12em]">
                  {section.title}
                </p>
              )}
              {visible.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={collapsed ? link.label : undefined}
                  className={({ isActive }) => clsx(
                    'sidebar-link',
                    (isActive || location.pathname.startsWith(link.to + '/')) ? 'active' : '',
                  )}
                >
                  <link.icon size={17} className="shrink-0 nav-icon transition-colors" />
                  {!collapsed && (
                    <span className="truncate text-[13px]">{link.label}</span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── User info ───────────────────────────────────────────────────── */}
      {!collapsed && user && (
        <div className="px-3 py-3 border-t border-coal-700/50">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-coal-800/60 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <span className="text-amber-400 text-xs font-black">{user.full_name?.[0] || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-coal-200 text-xs font-semibold truncate">{user.full_name}</p>
              <p className="text-coal-500 text-[10px] truncate">{ROLE_LABEL[user.role] || user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

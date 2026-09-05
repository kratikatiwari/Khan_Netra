import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiAlertTriangle, FiAlertCircle, FiUsers, FiTrendingUp, FiTrendingDown, FiArrowRight, FiBell, FiFileText, FiActivity, FiCpu } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PieChart, Pie, Cell } from 'recharts';
import { analyticsApi } from '../../services/api';
import { formatDate, formatNumber, formatCurrency, scoreToColor, scoreToBg, timeAgo } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import ScoreBar from '../../components/ui/ScoreBar';
import { CardSkeleton, TableSkeleton } from '../../components/ui/LoadingSpinner';
import useAuthStore from '../../store/authStore';
import clsx from 'clsx';

const SEVERITY_COLORS = { critical: '#ef4444', fatal: '#ef4444', high: '#f59e0b', serious: '#f59e0b', medium: '#3b82f6', minor: '#22c55e', low: '#22c55e' };

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsApi.getDashboard(), analyticsApi.getComplianceTrend({ months: 6 })])
      .then(([dash, t]) => {
        setData(dash.data);
        setTrend(t.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <CardSkeleton count={4} />
      <div className="grid grid-cols-3 gap-6"><TableSkeleton rows={3} cols={3} /><TableSkeleton rows={3} cols={2} /><div className="skeleton h-64" /></div>
    </div>
  );

  const stats = data?.mines || {};
  const violations = data?.violations || {};
  const incidents = data?.incidents || {};
  const scores = data?.scores || {};

  const statCards = [
    { title: 'Total Mines', value: stats.total || 0, sub: `${stats.active || 0} Active · ${stats.suspended || 0} Suspended`, icon: FiMapPin, color: 'blue', link: '/mines' },
    { title: 'Open Violations', value: violations.open || 0, sub: `${violations.critical || 0} Critical · ${violations.high || 0} High`, icon: FiAlertCircle, color: parseInt(violations.critical) > 0 ? 'red' : 'yellow', link: '/violations' },
    { title: 'Active Incidents', value: incidents.open || 0, sub: `${incidents.fatal || 0} Fatal · ${incidents.serious || 0} Serious`, icon: FiAlertTriangle, color: parseInt(incidents.fatal) > 0 ? 'red' : 'orange', link: '/incidents' },
    { title: 'Total Workers', value: formatNumber(stats.total_workers), sub: `Across ${stats.total || 0} mines`, icon: FiUsers, color: 'green', link: '/mines' },
  ];

  const scoreCards = [
    { label: 'Avg. Compliance', value: scores.avg_compliance, icon: FiActivity },
    { label: 'Avg. Safety', value: scores.avg_safety, icon: FiAlertTriangle },
    { label: 'Avg. Environmental', value: scores.avg_env, icon: FiTrendingUp },
    { label: 'Avg. Risk Score', value: scores.avg_risk, icon: FiCpu, inverted: true },
  ];

  const trendData = trend.map(t => ({
    month: new Date(t.month).toLocaleDateString('en-IN', { month: 'short' }),
    violations: parseInt(t.violations) || 0,
    critical: parseInt(t.critical) || 0,
    resolved: parseInt(t.resolved) || 0,
  }));

  const radarData = [
    { subject: 'Compliance', A: parseFloat(scores.avg_compliance || 0) },
    { subject: 'Safety', A: parseFloat(scores.avg_safety || 0) },
    { subject: 'Environment', A: parseFloat(scores.avg_env || 0) },
    { subject: 'Operations', A: 75 },
    { subject: 'Documentation', A: 68 },
  ];

  const violPieData = [
    { name: 'Critical', value: parseInt(violations.critical || 0) },
    { name: 'High', value: parseInt(violations.high || 0) },
    { name: 'Medium', value: Math.max(0, parseInt(violations.open || 0) - parseInt(violations.critical || 0) - parseInt(violations.high || 0)) },
    { name: 'Closed', value: Math.max(0, parseInt(violations.total || 0) - parseInt(violations.open || 0)) },
  ].filter(d => d.value > 0);
  const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between page-header mb-2">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.full_name?.split(' ')[0]}. Here's the latest compliance overview.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-coal-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live Data · {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.title} to={card.link} className="card hover:shadow-hover transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className={clsx('p-2.5 rounded-xl',
                card.color === 'red' ? 'bg-red-50 text-red-600' :
                card.color === 'yellow' ? 'bg-yellow-50 text-yellow-600' :
                card.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                card.color === 'green' ? 'bg-green-50 text-green-600' :
                'bg-blue-50 text-blue-600'
              )}>
                <card.icon size={20} />
              </div>
              <FiArrowRight size={16} className="text-coal-300 group-hover:text-primary-500 transition-colors" />
            </div>
            <div className="text-2xl font-black text-coal-900">{card.value}</div>
            <div className="text-xs font-medium text-coal-500 mt-1">{card.title}</div>
            <div className="text-[11px] text-coal-400 mt-0.5">{card.sub}</div>
          </Link>
        ))}
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {scoreCards.map(sc => {
          const val = parseFloat(sc.value || 0);
          const display = sc.inverted ? 100 - val : val;
          return (
            <div key={sc.label} className="card">
              <div className="flex items-center gap-2 mb-3">
                <sc.icon size={16} className="text-coal-400" />
                <span className="text-xs font-semibold text-coal-600">{sc.label}</span>
              </div>
              <div className={clsx('text-3xl font-black mb-2', scoreToColor(display))}>{val.toFixed(1)}%</div>
              <ScoreBar score={display} showLabel={false} />
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title mb-0">Violation Trends</h3>
              <p className="text-xs text-coal-400">Last 6 months</p>
            </div>
            <Link to="/analytics" className="btn-outline btn-sm">View Analytics</Link>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="violGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="violations" stroke="#3b82f6" strokeWidth={2} fill="url(#violGrad)" name="Total" />
                <Area type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} fill="url(#critGrad)" name="Critical" />
                <Area type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} fill="none" name="Resolved" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-coal-300 text-sm">No trend data available</div>
          )}
        </div>

        {/* Radar / Pie */}
        <div className="card">
          <h3 className="section-title mb-3">Compliance Radar</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
              <Radar name="Score" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {radarData.map(d => (
              <div key={d.subject} className="flex items-center justify-between">
                <span className="text-xs text-coal-500">{d.subject}</span>
                <span className={clsx('text-xs font-bold', scoreToColor(d.A))}>{d.A.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Violations */}
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Recent Violations</h3>
            <Link to="/violations" className="text-xs text-primary-600 hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {(data?.recent_violations || []).slice(0, 5).map(v => (
              <Link to={`/violations/${v.id}`} key={v.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-coal-50 transition-colors">
                <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', v.severity === 'critical' ? 'bg-red-500' : v.severity === 'high' ? 'bg-yellow-500' : 'bg-blue-500')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-coal-800 truncate">{v.category}</p>
                  <p className="text-[11px] text-coal-500">{v.mine_name}</p>
                </div>
                <Badge color={v.severity === 'critical' ? 'red' : v.severity === 'high' ? 'yellow' : 'blue'}>{v.severity}</Badge>
              </Link>
            ))}
            {(!data?.recent_violations || !data.recent_violations.length) && (
              <p className="text-xs text-coal-400 text-center py-4">No open violations</p>
            )}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="card lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Recent Incidents</h3>
            <Link to="/incidents" className="text-xs text-primary-600 hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {(data?.recent_incidents || []).slice(0, 5).map(i => (
              <div key={i.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-coal-50">
                <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', i.severity === 'fatal' ? 'bg-red-600' : i.severity === 'serious' ? 'bg-orange-500' : 'bg-yellow-500')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-coal-800 truncate">{i.type}</p>
                  <p className="text-[11px] text-coal-500">{i.mine_name} · {formatDate(i.incident_date)}</p>
                </div>
                <Badge color={i.severity === 'fatal' ? 'red' : i.severity === 'serious' ? 'orange' : 'yellow'}>{i.severity}</Badge>
              </div>
            ))}
            {(!data?.recent_incidents || !data.recent_incidents.length) && (
              <p className="text-xs text-coal-400 text-center py-4">No open incidents</p>
            )}
          </div>
        </div>

        {/* Alerts column */}
        <div className="card lg:col-span-1 space-y-4">
          <h3 className="section-title mb-0">System Alerts</h3>

          {/* Doc alerts */}
          {(data?.document_alerts || []).slice(0, 2).map(d => (
            <Link to="/documents" key={d.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
              <FiFileText size={16} className="text-red-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-800 truncate">{d.title}</p>
                <p className="text-[11px] text-red-600">{d.status === 'expired' ? 'EXPIRED' : 'Expiring Soon'} · {d.mine_name}</p>
              </div>
            </Link>
          ))}

          {/* Upcoming inspections */}
          {(data?.upcoming_inspections || []).slice(0, 2).map(ins => (
            <Link to="/inspections" key={ins.id} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
              <FiActivity size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-800 truncate">{ins.mine_name}</p>
                <p className="text-[11px] text-blue-600">{ins.type} · {formatDate(ins.scheduled_date)}</p>
              </div>
            </Link>
          ))}

          {/* Env alerts */}
          {(data?.environmental_alerts || []).slice(0, 2).map(e => (
            <Link to="/environment" key={e.id} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100 hover:bg-yellow-100 transition-colors">
              <FiBell size={16} className="text-yellow-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-yellow-800 truncate">{e.parameter} – {e.status.toUpperCase()}</p>
                <p className="text-[11px] text-yellow-600">{e.mine_name} · {e.value} {e.unit}</p>
              </div>
            </Link>
          ))}

          {!data?.document_alerts?.length && !data?.upcoming_inspections?.length && !data?.environmental_alerts?.length && (
            <p className="text-xs text-coal-400 text-center py-4">No active alerts</p>
          )}
        </div>
      </div>
    </div>
  );
}

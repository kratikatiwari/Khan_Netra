import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiMapPin, FiAlertTriangle, FiAlertCircle, FiUsers,
  FiArrowRight, FiBell, FiFileText, FiActivity,
  FiCpu, FiShield, FiWind, FiTrendingUp, FiClock,
  FiUserCheck, FiNavigation, FiZap, FiRadio,
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis,
} from 'recharts';
import { analyticsApi, deadlinesApi, contractorsApi, fieldReportsApi, riskApi, disasterApi } from '../../services/api';
import { formatDate, formatNumber, scoreToColor, timeAgo } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import ScoreBar from '../../components/ui/ScoreBar';
import { CardSkeleton } from '../../components/ui/LoadingSpinner';
import useAuthStore from '../../store/authStore';
import clsx from 'clsx';

const AMBER = '#f59e0b';
const DANGER = '#ef4444';
const SUCCESS = '#22c55e';
const INFO = '#06b6d4';
const SAFETY = '#f97316';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data,         setData]         = useState(null);
  const [trend,        setTrend]        = useState([]);
  const [overdueD,     setOverdueD]     = useState([]);
  const [upcomingD,    setUpcomingD]    = useState([]);
  const [highRisk,     setHighRisk]     = useState([]);
  const [fieldAlerts,  setFieldAlerts]  = useState([]);
  const [disasterAlerts, setDisasterAlerts] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.getDashboard(),
      analyticsApi.getComplianceTrend({ months: 6 }),
      deadlinesApi.getOverdue().catch(()=>({data:[]})),
      deadlinesApi.getUpcoming({ days: 14 }).catch(()=>({data:[]})),
      riskApi.getHighRisk().catch(()=>({data:{high_risk_mines:[]}})),
      fieldReportsApi.getAll({ severity:'critical', status:'open', limit:5 }).catch(()=>({data:[]})),
      disasterApi.getActive().catch(()=>({data:[], summary:{}})),
    ])
      .then(([d, t, ov, up, hr, fr, ds]) => {
        setData(d.data);
        setTrend(t.data);
        setOverdueD(ov.data || []);
        setUpcomingD(up.data || []);
        setHighRisk((hr.data?.high_risk_mines || []).slice(0, 4));
        setFieldAlerts(fr.data || []);
        setDisasterAlerts((ds.data || []).filter(a => ['CRITICAL','HIGH'].includes(a.severity)).slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <CardSkeleton count={4} />
      <div className="grid grid-cols-4 gap-4"><CardSkeleton count={4} /></div>
    </div>
  );

  const mines      = data?.mines      || {};
  const violations = data?.violations || {};
  const incidents  = data?.incidents  || {};
  const scores     = data?.scores     || {};

  const statCards = [
    {
      label: 'Total Mines', value: mines.total || 0,
      sub: `${mines.active || 0} Active · ${mines.suspended || 0} Suspended`,
      icon: FiMapPin, color: 'info', link: '/mines',
    },
    {
      label: 'Open Violations', value: violations.open || 0,
      sub: `${violations.critical || 0} Critical · ${violations.high || 0} High`,
      icon: FiAlertCircle,
      color: parseInt(violations.critical) > 0 ? 'danger' : 'warning',
      link: '/violations',
    },
    {
      label: 'Active Incidents', value: incidents.open || 0,
      sub: `${incidents.fatal || 0} Fatal · ${incidents.serious || 0} Serious`,
      icon: FiAlertTriangle,
      color: parseInt(incidents.fatal) > 0 ? 'danger' : 'safety',
      link: '/incidents',
    },
    {
      label: 'Total Workers', value: formatNumber(mines.total_workers),
      sub: `Across ${mines.total || 0} mines`,
      icon: FiUsers, color: 'success', link: '/mines',
    },
  ];

  const scoreCards = [
    { label: 'Avg. Compliance', value: scores.avg_compliance, icon: FiShield },
    { label: 'Safety Score',    value: scores.avg_safety,     icon: FiAlertTriangle },
    { label: 'Environmental',   value: scores.avg_env,        icon: FiWind },
    { label: 'Risk Level',      value: scores.avg_risk,       icon: FiCpu, inverted: true },
  ];

  const trendData = trend.map(t => ({
    month:      new Date(t.month).toLocaleDateString('en-IN', { month: 'short' }),
    violations: parseInt(t.violations) || 0,
    critical:   parseInt(t.critical)   || 0,
    resolved:   parseInt(t.resolved)   || 0,
  }));

  const radarData = [
    { subject: 'Compliance',   A: parseFloat(scores.avg_compliance || 0) },
    { subject: 'Safety',       A: parseFloat(scores.avg_safety     || 0) },
    { subject: 'Environment',  A: parseFloat(scores.avg_env        || 0) },
    { subject: 'Operations',   A: 75 },
    { subject: 'Docs',         A: 68 },
  ];

  const colorMap = {
    info:    { icon: 'text-info-400',    bg: 'bg-info-500/15 border-info-500/25' },
    danger:  { icon: 'text-danger-400',  bg: 'bg-danger-600/15 border-danger-500/25' },
    warning: { icon: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/25' },
    safety:  { icon: 'text-safety-400',  bg: 'bg-safety-500/15 border-safety-500/25' },
    success: { icon: 'text-success-400', bg: 'bg-success-600/15 border-success-500/25' },
  };

  const SEV_COLOR = { critical: 'red', high: 'yellow', fatal: 'red', serious: 'yellow', medium: 'blue', minor: 'green', near_miss: 'gray' };

  return (
    <div className="space-y-5">

      {/* ════════════════════════════════════════════════════════
          HERO — mine-dashboard.jpeg cinematic banner
      ════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '320px',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,.55)',
        }}
      >
        {/* ── Mine image ── */}
        <img
          src="/assets/mine-dashboard.jpeg"
          alt="KhanNetra — Open-pit coal mine monitoring"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            display: 'block',
          }}
          onError={e => {
            // Graceful fallback — hide img, show gradient background
            e.currentTarget.style.display = 'none';
          }}
        />

        {/* ── Dark navy overlay — keeps image visible, ensures text readability ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg,rgba(6,14,28,.72) 0%,rgba(6,14,28,.38) 50%,rgba(6,14,28,.65) 100%)',
        }} />
        {/* Bottom gradient for card row transition */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          background: 'linear-gradient(to top,rgba(6,14,28,.90) 0%,transparent 100%)',
        }} />

        {/* ── Hero text ── */}
        <div style={{
          position: 'absolute', inset: 0, padding: '28px 32px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 10,
        }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '4px 12px', borderRadius: '999px', marginBottom: '10px',
                background: 'rgba(245,158,11,.14)', border: '1px solid rgba(245,158,11,.32)',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Live Operations · DGMS Monitoring
                </span>
              </div>
              <h2 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 'clamp(1.4rem,2.5vw,2rem)', lineHeight: 1.1, margin: 0 }}>
                Command Center<br/>
                <span style={{ color: '#f59e0b' }}>Coal Mine Governance</span>
              </h2>
              <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '13.5px', marginTop: '8px', lineHeight: 1.5 }}>
                AI-powered compliance monitoring and smart governance for India's coal mining sector.
              </p>
            </div>
            {/* Date badge */}
            <div style={{
              padding: '8px 14px', borderRadius: '12px', textAlign: 'right', flexShrink: 0,
              background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)',
              backdropFilter: 'blur(8px)',
            }}>
              <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Today</p>
              <p style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 700, margin: '3px 0 0' }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Bottom row — welcome + mini stats */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '14px', margin: 0 }}>
              Welcome back, <strong style={{ color: '#fbbf24' }}>{user?.full_name?.split(' ')[0]}</strong>
              {user?.designation && <span style={{ color: 'rgba(255,255,255,.38)' }}> · {user.designation}</span>}
            </p>
            {/* Quick mini stats row */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                { v: mines.total || 0,          l: 'Mines',       c: '#60a5fa' },
                { v: violations.open || 0,      l: 'Open Viol.',  c: parseInt(violations.critical) > 0 ? '#ef4444' : '#f59e0b' },
                { v: incidents.open || 0,       l: 'Incidents',   c: parseInt(incidents.fatal) > 0 ? '#ef4444' : '#f97316' },
                { v: `${parseFloat(scores.avg_compliance || 0).toFixed(0)}%`, l: 'Compliance', c: '#22c55e' },
              ].map(s => (
                <div key={s.l} style={{
                  padding: '7px 14px', borderRadius: '10px', textAlign: 'center',
                  background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)',
                  backdropFilter: 'blur(10px)',
                }}>
                  <p style={{ color: s.c, fontWeight: 900, fontSize: '18px', margin: 0, lineHeight: 1 }}>{s.v}</p>
                  <p style={{ color: 'rgba(255,255,255,.42)', fontSize: '10px', margin: '3px 0 0' }}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Disaster Alert Banner (shows only when HIGH/CRITICAL alerts active) ── */}
      {disasterAlerts.length > 0 && (
        <div style={{
          borderRadius:'16px', padding:'14px 18px',
          background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.35)',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
            <FiRadio size={18} style={{ color:'#f87171', flexShrink:0, animation:'pulse 1s infinite' }}/>
            <div>
              <span style={{ color:'#f87171', fontWeight:800, fontSize:'13px' }}>
                🚨 {disasterAlerts.length} Active Disaster Alert{disasterAlerts.length>1?'s':''} —&nbsp;
              </span>
              {disasterAlerts.slice(0,2).map((a,i) => (
                <span key={a.id} style={{ color:'rgba(255,255,255,.65)', fontSize:'12px' }}>
                  {a.severity}: {a.alert_type}{i < disasterAlerts.slice(0,2).length-1 ? ' · ' : ''}
                </span>
              ))}
            </div>
          </div>
          <Link to="/disaster"
            style={{ padding:'6px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:700,
                     background:'rgba(239,68,68,.2)', color:'#f87171', border:'1px solid rgba(239,68,68,.4)',
                     textDecoration:'none', flexShrink:0, whiteSpace:'nowrap' }}>
            View Alerts →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const c = colorMap[card.color] || colorMap.info;
          return (
            <Link key={card.label} to={card.link}
              className="stat-card group hover:shadow-hover transition-all duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className={clsx('p-2.5 rounded-xl border', c.bg)}>
                  <card.icon size={18} className={c.icon} />
                </div>
                <FiArrowRight size={14} className="text-coal-700 group-hover:text-amber-400 transition-colors mt-0.5" />
              </div>
              <p className="text-3xl font-black text-coal-50 tabular-nums">{card.value}</p>
              <p className="text-xs font-semibold text-coal-400 mt-0.5">{card.label}</p>
              <p className="text-[11px] text-coal-600 mt-0.5">{card.sub}</p>
            </Link>
          );
        })}
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {scoreCards.map(sc => {
          const val  = parseFloat(sc.value || 0);
          const disp = sc.inverted ? 100 - val : val;
          return (
            <div key={sc.label} className="card">
              <div className="flex items-center gap-2 mb-3">
                <sc.icon size={14} className="text-coal-600" />
                <span className="text-[11px] font-bold text-coal-500 uppercase tracking-wide">{sc.label}</span>
              </div>
              <p className={clsx('text-3xl font-black tabular-nums mb-2', scoreToColor(disp))}>{val.toFixed(1)}%</p>
              <ScoreBar score={disp} showLabel={false} />
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Trend */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="section-title mb-0">Violation Trends</h3>
              <p className="text-[11px] text-coal-600">Last 6 months</p>
            </div>
            <Link to="/analytics" className="btn-outline btn-sm">Full Analytics</Link>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="vGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={AMBER}  stopOpacity={0.3} />
                    <stop offset="95%" stopColor={AMBER}  stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={DANGER} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={DANGER} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#343a40" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6c757d' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6c757d' }} />
                <Tooltip />
                <Area type="monotone" dataKey="violations" stroke={AMBER}  strokeWidth={2} fill="url(#vGrad)" name="Total" />
                <Area type="monotone" dataKey="critical"   stroke={DANGER} strokeWidth={2} fill="url(#cGrad)" name="Critical" />
                <Area type="monotone" dataKey="resolved"   stroke={SUCCESS} strokeWidth={2} fill="none" name="Resolved" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-coal-700 text-sm">No trend data yet</div>
          )}
        </div>

        {/* Radar */}
        <div className="card">
          <h3 className="section-title mb-2">Compliance Radar</h3>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#343a40" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6c757d' }} />
              <Radar name="Score" dataKey="A" stroke={AMBER} fill={AMBER} fillOpacity={0.15} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {radarData.map(d => (
              <div key={d.subject} className="flex items-center justify-between">
                <span className="text-[11px] text-coal-500">{d.subject}</span>
                <span className={clsx('text-[11px] font-bold', scoreToColor(d.A))}>{d.A.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Recent violations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Recent Violations</h3>
            <Link to="/violations" className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold">View All →</Link>
          </div>
          <div className="space-y-2.5">
            {(data?.recent_violations || []).slice(0, 5).map(v => (
              <Link to={`/violations/${v.id}`} key={v.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-coal-800/50 transition-colors">
                <div className={clsx('w-1.5 h-6 rounded-full shrink-0',
                  v.severity === 'critical' ? 'bg-danger-500' : v.severity === 'high' ? 'bg-amber-500' : 'bg-info-500')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-coal-300 truncate">{v.category}</p>
                  <p className="text-[11px] text-coal-600">{v.mine_name}</p>
                </div>
                <Badge color={SEV_COLOR[v.severity]}>{v.severity}</Badge>
              </Link>
            ))}
            {!data?.recent_violations?.length && (
              <p className="text-xs text-coal-700 text-center py-6">No open violations</p>
            )}
          </div>
        </div>

        {/* Recent incidents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Recent Incidents</h3>
            <Link to="/incidents" className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold">View All →</Link>
          </div>
          <div className="space-y-2.5">
            {(data?.recent_incidents || []).slice(0, 5).map(i => (
              <div key={i.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-coal-800/50 transition-colors">
                <div className={clsx('w-1.5 h-6 rounded-full shrink-0',
                  i.severity === 'fatal' ? 'bg-danger-600' : i.severity === 'serious' ? 'bg-safety-500' : 'bg-amber-500')} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-coal-300 truncate">{i.type}</p>
                  <p className="text-[11px] text-coal-600">{i.mine_name} · {formatDate(i.incident_date)}</p>
                </div>
                <Badge color={SEV_COLOR[i.severity]}>{i.severity.replace('_',' ')}</Badge>
              </div>
            ))}
            {!data?.recent_incidents?.length && (
              <p className="text-xs text-coal-700 text-center py-6">No open incidents</p>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="card space-y-2.5">
          <h3 className="section-title mb-0">Active Alerts</h3>

          {(data?.document_alerts || []).slice(0, 2).map(d => (
            <Link to="/documents" key={d.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-danger-600/10 border border-danger-500/20 hover:bg-danger-600/15 transition-colors">
              <FiFileText size={14} className="text-danger-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-danger-300 truncate">{d.title}</p>
                <p className="text-[11px] text-danger-500">{d.status === 'expired' ? '⛔ EXPIRED' : '⚠️ Expiring Soon'} · {d.mine_name}</p>
              </div>
            </Link>
          ))}

          {(data?.upcoming_inspections || []).slice(0, 2).map(ins => (
            <Link to="/inspections" key={ins.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-info-600/10 border border-info-500/20 hover:bg-info-600/15 transition-colors">
              <FiActivity size={14} className="text-info-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-info-300 truncate">{ins.mine_name}</p>
                <p className="text-[11px] text-info-500">{ins.type} · {formatDate(ins.scheduled_date)}</p>
              </div>
            </Link>
          ))}

          {(data?.environmental_alerts || []).slice(0, 2).map(e => (
            <Link to="/environment" key={e.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors">
              <FiBell size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-300 truncate">{e.parameter} – {e.status?.toUpperCase()}</p>
                <p className="text-[11px] text-amber-600">{e.mine_name} · {parseFloat(e.value).toFixed(2)} {e.unit}</p>
              </div>
            </Link>
          ))}

          {!data?.document_alerts?.length && !data?.upcoming_inspections?.length && !data?.environmental_alerts?.length && (
            <p className="text-xs text-coal-700 text-center py-6">No active alerts ✓</p>
          )}
        </div>
      </div>

      {/* ── NEW ROW: Deadlines + High-Risk Mines + Field Alerts ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Overdue / Upcoming Deadlines */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0 flex items-center gap-2">
              <FiClock size={14} className="text-amber-400"/> Compliance Deadlines
            </h3>
            <Link to="/deadlines" className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold">View All →</Link>
          </div>
          {overdueD.length > 0 && (
            <div className="mb-3 p-2.5 rounded-xl bg-danger-600/10 border border-danger-500/20">
              <p className="text-[10px] font-black text-danger-400 uppercase tracking-widest mb-1.5">⛔ {overdueD.length} Overdue</p>
              {overdueD.slice(0,3).map(d => (
                <div key={d.id} className="flex justify-between py-1 border-b border-danger-500/10 last:border-0">
                  <span className="text-xs text-danger-300 truncate">{d.title}</span>
                  <span className="text-[10px] text-danger-500 shrink-0 ml-2">{Math.abs(d.days_remaining)}d ago</span>
                </div>
              ))}
            </div>
          )}
          {upcomingD.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5">⏰ Due Within 14 Days</p>
              {upcomingD.slice(0,4).map(d => (
                <div key={d.id} className="flex justify-between py-1.5 border-b border-coal-700/40 last:border-0">
                  <span className="text-xs text-coal-300 truncate">{d.title}</span>
                  <span className={clsx('text-[10px] shrink-0 ml-2 font-bold', d.days_remaining <= 3 ? 'text-danger-400' : 'text-amber-400')}>
                    {d.days_remaining}d
                  </span>
                </div>
              ))}
            </div>
          )}
          {!overdueD.length && !upcomingD.length && (
            <p className="text-xs text-coal-700 text-center py-6">No urgent deadlines ✓</p>
          )}
        </div>

        {/* High-Risk Mines */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0 flex items-center gap-2">
              <FiZap size={14} className="text-danger-400"/> High-Risk Mines
            </h3>
            <Link to="/risk-dashboard" className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold">Risk Dashboard →</Link>
          </div>
          <div className="space-y-2.5">
            {highRisk.map((m, i) => (
              <Link to={`/mines/${m.id}`} key={m.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-coal-800/50 transition-colors">
                <div className={clsx('w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0',
                  i===0?'bg-danger-600/25 text-danger-400':i===1?'bg-amber-500/20 text-amber-400':'bg-coal-700 text-coal-500')}>
                  #{i+1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-coal-200 truncate">{m.name}</p>
                  <p className="text-[10px] text-coal-600">{m.state} · {m.critical_violations||0} critical</p>
                </div>
                <span className={clsx('text-sm font-black tabular-nums',
                  parseFloat(m.risk_score)>=70?'text-danger-400':parseFloat(m.risk_score)>=40?'text-amber-400':'text-success-400')}>
                  {parseFloat(m.risk_score).toFixed(0)}%
                </span>
              </Link>
            ))}
            {!highRisk.length && <p className="text-xs text-coal-700 text-center py-6">No high-risk mines ✓</p>}
          </div>
        </div>

        {/* Field Reports (critical open) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0 flex items-center gap-2">
              <FiNavigation size={14} className="text-safety-400"/> Field Reports
            </h3>
            <Link to="/field-reports" className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold">View All →</Link>
          </div>
          <div className="space-y-2.5">
            {fieldAlerts.map(r => (
              <div key={r.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-danger-600/8 border border-danger-500/15">
                <FiAlertTriangle size={13} className="text-danger-400 shrink-0 mt-0.5"/>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-coal-200 truncate">{r.title}</p>
                  <p className="text-[11px] text-coal-600">{r.mine_name} · {r.location_name||'Unknown location'}</p>
                  <p className="text-[10px] text-coal-700 mt-0.5">{timeAgo(r.created_at)}</p>
                </div>
              </div>
            ))}
            {!fieldAlerts.length && (
              <div className="text-center py-6">
                <p className="text-xs text-coal-700">No critical field reports</p>
                <Link to="/field-reports" className="text-[11px] text-amber-400 hover:underline mt-1 block">Submit a Report</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Links Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to:'/contractors',  icon:FiUserCheck,  label:'Contractors',    sub:'Safety & compliance', color:'text-info-400 bg-info-600/10 border-info-500/20' },
          { to:'/deadlines',    icon:FiClock,      label:'Deadlines',      sub:'Track & escalate',    color:'text-amber-400 bg-amber-500/10 border-amber-500/20' },
          { to:'/field-reports',icon:FiNavigation, label:'Field Reports',  sub:'Geo-tagged reports',  color:'text-safety-400 bg-safety-500/10 border-safety-500/20' },
          { to:'/risk-dashboard',icon:FiTrendingUp,label:'Risk Dashboard', sub:'Anomaly indicators',  color:'text-danger-400 bg-danger-600/10 border-danger-500/20' },
        ].map(q => (
          <Link key={q.to} to={q.to}
            className={clsx('flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-hover', q.color)}>
            <q.icon size={18} className="shrink-0"/>
            <div className="min-w-0">
              <p className="text-sm font-bold text-coal-200">{q.label}</p>
              <p className="text-[10px] text-coal-500">{q.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

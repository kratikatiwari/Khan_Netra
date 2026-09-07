import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle, FiTrendingUp, FiAlertCircle, FiRefreshCw,
  FiShield, FiMapPin, FiActivity, FiZap,
} from 'react-icons/fi';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { riskApi } from '../../services/api';
import Badge from '../../components/ui/Badge';
import ScoreBar from '../../components/ui/ScoreBar';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatDate, scoreToColor } from '../../utils/helpers';
import useAuthStore from '../../store/authStore';
import clsx from 'clsx';

const RISK_STYLE = {
  CRITICAL: 'bg-danger-600/15 border-danger-500/30 text-danger-400',
  HIGH:     'bg-amber-500/15  border-amber-500/30  text-amber-400',
  MEDIUM:   'bg-info-600/15   border-info-500/30   text-info-400',
  LOW:      'bg-success-600/15 border-success-500/30 text-success-400',
};

function riskLevel(score) {
  return score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 25 ? 'MEDIUM' : 'LOW';
}

export default function RiskDashboard() {
  const { user } = useAuthStore();
  const [data,     setData]     = useState(null);
  const [roleData, setRoleData] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    try {
      const [hr, rb] = await Promise.all([riskApi.getHighRisk(), riskApi.getRoleBased()]);
      setData(hr.data);
      setRoleData(rb);
    } catch {} finally { setLoading(false); setLastRefresh(new Date()); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <PageLoader message="Analysing risk data…"/>;

  const trendData = (data?.compliance_trend || []).map(t => ({
    month: t.month,
    violations: parseInt(t.violations) || 0,
    critical:   parseInt(t.critical)   || 0,
  }));

  const catData = (data?.top_categories || []).slice(0,6).map(c => ({
    name:  (c.category||'Unknown').substring(0,12),
    count: parseInt(c.count),
    fines: parseFloat(c.total_fines||0),
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><FiAlertTriangle className="text-amber-400"/> Risk Dashboard</h1>
          <p className="page-subtitle">High-risk mines, recurring violations, anomaly indicators and trend analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-coal-600">Refreshed {lastRefresh.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
          <button onClick={load} className="btn-outline btn-sm"><FiRefreshCw size={13}/> Refresh</button>
        </div>
      </div>

      {/* Role-based panel */}
      {roleData && (
        <RolePanel role={roleData.role} data={roleData.data}/>
      )}

      {/* High-risk mines */}
      <div className="card">
        <h3 className="section-title flex items-center gap-2"><FiAlertCircle className="text-danger-400"/> High-Risk Mines</h3>
        <div className="space-y-3">
          {(data?.high_risk_mines || []).slice(0,6).map((mine, i) => {
            const level = riskLevel(parseFloat(mine.risk_score));
            return (
              <Link to={`/mines/${mine.id}`} key={mine.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-coal-800/40 border border-coal-700/40 hover:border-amber-500/30 transition-all">
                <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0',
                  i===0?'bg-danger-600/25 text-danger-400':i<=2?'bg-amber-500/20 text-amber-400':'bg-coal-700 text-coal-400')}>
                  #{i+1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-coal-100 text-sm">{mine.name}</span>
                    <span className="text-[11px] text-coal-600">{mine.state}</span>
                    <Badge color={mine.status==='suspended'?'red':mine.status==='active'?'green':'yellow'}>{mine.status}</Badge>
                  </div>
                  <div className="flex gap-4 text-[11px] text-coal-500">
                    <span>🔴 {mine.critical_violations||0} critical violations</span>
                    <span>🚨 {mine.recent_serious_incidents||0} serious incidents (90d)</span>
                    <span>⚠️ {mine.env_alerts||0} env alerts</span>
                    {mine.expired_docs>0 && <span>📄 {mine.expired_docs} expired docs</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={clsx('text-xl font-black', parseFloat(mine.risk_score)>=70?'text-danger-400':parseFloat(mine.risk_score)>=40?'text-amber-400':'text-success-400')}>
                    {parseFloat(mine.risk_score).toFixed(0)}%
                  </p>
                  <Badge color={level==='CRITICAL'?'red':level==='HIGH'?'yellow':level==='MEDIUM'?'blue':'green'}>{level}</Badge>
                </div>
              </Link>
            );
          })}
          {!data?.high_risk_mines?.length && <p className="text-coal-600 text-sm text-center py-4">No high-risk mines detected</p>}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Trend */}
        <div className="card">
          <h3 className="section-title">Violation Trend (6 Months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#343a40"/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#6c757d'}}/>
              <YAxis tick={{fontSize:11,fill:'#6c757d'}}/>
              <Tooltip contentStyle={{background:'#1c2333',border:'1px solid #343a40',borderRadius:8,fontSize:12}}/>
              <Line type="monotone" dataKey="violations" stroke="#f59e0b" strokeWidth={2} name="Total" dot={false}/>
              <Line type="monotone" dataKey="critical"   stroke="#ef4444" strokeWidth={2} name="Critical" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top categories */}
        <div className="card">
          <h3 className="section-title">Top Violation Categories</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#343a40"/>
              <XAxis type="number" tick={{fontSize:11,fill:'#6c757d'}}/>
              <YAxis dataKey="name" type="category" tick={{fontSize:10,fill:'#6c757d'}} width={80}/>
              <Tooltip contentStyle={{background:'#1c2333',border:'1px solid #343a40',borderRadius:8,fontSize:12}}/>
              <Bar dataKey="count" name="Count" radius={[0,4,4,0]}>
                {catData.map((_,i) => <Cell key={i} fill={i===0?'#ef4444':i<=2?'#f59e0b':'#3b82f6'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recurring violations */}
      {data?.recurring_violations?.length > 0 && (
        <div className="card">
          <h3 className="section-title flex items-center gap-2"><FiZap className="text-safety-400"/> Recurring Violations (3+ times)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.recurring_violations.map((r, i) => (
              <div key={i} className="p-3 rounded-xl bg-coal-800/50 border border-coal-700/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-coal-200">{r.category} — {r.type}</span>
                  <span className="text-sm font-black text-danger-400">{r.occurrences}x</span>
                </div>
                <p className="text-[11px] text-coal-500">{r.mine_name} · Last: {formatDate(r.last_detected)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomaly mines */}
      {data?.anomaly_mines?.length > 0 && (
        <div className="card border-amber-500/25">
          <h3 className="section-title flex items-center gap-2"><FiTrendingUp className="text-amber-400"/> Anomaly Indicators</h3>
          <p className="text-xs text-coal-600 mb-3">Mines with elevated risk scores and multiple recent violations</p>
          <div className="space-y-2">
            {data.anomaly_mines.map(m => (
              <Link to={`/mines/${m.id}`} key={m.id} className="flex items-center gap-4 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                <FiAlertTriangle size={16} className="text-amber-400 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-coal-200 text-sm">{m.name}</span>
                  <span className="text-coal-500 text-xs ml-2">{m.state}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-coal-500">{m.recent_violations} violations in 30d</p>
                  <p className="text-xs font-bold text-amber-400">Risk: {parseFloat(m.risk_score).toFixed(0)}%</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RolePanel({ role, data }) {
  if (!data) return null;

  // Mine manager view
  if (role === 'mine_manager') {
    const mine = data.mine;
    if (!mine) return null;
    return (
      <div className={clsx('p-5 rounded-2xl border', RISK_STYLE[riskLevel(parseFloat(mine.risk_score))])}>
        <h3 className="font-bold text-base mb-3 flex items-center gap-2"><FiMapPin size={16}/> {mine.name} — Your Mine</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            ['Open Violations', data.violations?.find(v=>v.status==='open')?.c||0, 'text-danger-400'],
            ['Incidents (90d)',  (data.incidents||[]).reduce((s,i)=>s+parseInt(i.c),0), 'text-amber-400'],
            ['Env Alerts (7d)', data.env_alerts||0, 'text-safety-400'],
            ['Overdue Deadlines', data.overdue_deadlines||0, 'text-danger-400'],
          ].map(([label,val,color]) => (
            <div key={label} className="bg-coal-900/40 rounded-xl p-3 text-center">
              <p className={clsx('text-xl font-black', color)}>{val}</p>
              <p className="text-[10px] text-coal-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Inspector view
  if (role === 'inspector') {
    return (
      <div className="card">
        <h3 className="section-title flex items-center gap-2"><FiActivity size={16}/> Your Assignments</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-coal-500 uppercase tracking-widest mb-2">Upcoming Inspections</p>
            {(data.upcoming_inspections||[]).slice(0,4).map(i => (
              <div key={i.id} className="flex items-center justify-between py-1.5 border-b border-coal-700/40">
                <span className="text-sm text-coal-300">{i.mine_name}</span>
                <span className="text-xs text-amber-400">{formatDate(i.scheduled_date)}</span>
              </div>
            ))}
            {!(data.upcoming_inspections||[]).length && <p className="text-xs text-coal-600">No upcoming inspections</p>}
          </div>
          <div>
            <p className="text-xs font-bold text-coal-500 uppercase tracking-widest mb-2">Pending Corrective Actions</p>
            {(data.pending_actions||[]).slice(0,4).map(a => (
              <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-coal-700/40">
                <span className="text-sm text-coal-300 truncate">{a.category}</span>
                <span className="text-xs text-danger-400">{formatDate(a.due_date)}</span>
              </div>
            ))}
            {!(data.pending_actions||[]).length && <p className="text-xs text-coal-600">No pending actions</p>}
          </div>
        </div>
      </div>
    );
  }

  // Admin / Govt officer national view
  return (
    <div className="card">
      <h3 className="section-title flex items-center gap-2"><FiShield size={16}/> National Overview</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(data.mine_stats||[]).map(s => (
          <div key={s.status} className="bg-coal-800/50 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-coal-100">{s.count}</p>
            <p className="text-[10px] text-coal-500 capitalize">{s.status} mines</p>
            <p className="text-[10px] text-coal-600">Avg compliance: {parseFloat(s.avg_compliance||0).toFixed(0)}%</p>
          </div>
        ))}
      </div>
      {(data.overdue_deadlines||[]).length > 0 && (
        <div className="mt-3 pt-3 border-t border-coal-700/50">
          <p className="text-xs font-bold text-danger-400 mb-2">{data.overdue_deadlines.length} Overdue Deadlines Nationally</p>
          <div className="flex flex-wrap gap-2">
            {data.overdue_deadlines.map(d => (
              <span key={d.id} className="text-[11px] px-2 py-1 rounded bg-danger-600/15 text-danger-400 border border-danger-500/20">{d.title} — {d.mine_name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { FiBarChart2, FiDownload } from 'react-icons/fi';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { analyticsApi, reportsApi } from '../../services/api';
import { formatMT, downloadBlob } from '../../utils/helpers';
import ScoreBar from '../../components/ui/ScoreBar';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import Badge from '../../components/ui/Badge';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6','#ef4444','#f59e0b','#22c55e','#8b5cf6','#06b6d4'];

export default function Analytics() {
  const [ranking, setRanking] = useState([]);
  const [violation, setViolation] = useState(null);
  const [production, setProduction] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      analyticsApi.getMineRanking(),
      analyticsApi.getViolationAnalytics(),
      analyticsApi.getProductionAnalytics(),
      analyticsApi.getComplianceTrend({ months: 12 }),
    ]).then(([r, v, p, t]) => {
      setRanking(r.data);
      setViolation(v.data);
      setProduction(p.data);
      setTrend(t.data.map(d => ({
        month: new Date(d.month).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        violations: parseInt(d.violations) || 0,
        critical: parseInt(d.critical) || 0,
        resolved: parseInt(d.resolved) || 0,
      })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const downloadExcel = async () => {
    try {
      const res = await reportsApi.downloadExcel({});
      downloadBlob(res, 'KhanNetra-Report.xlsx');
      toast.success('Excel report downloaded');
    } catch {}
  };

  const downloadPDF = async () => {
    try {
      const res = await reportsApi.downloadPDF({ type: 'compliance' });
      downloadBlob(res, 'KhanNetra-Compliance-Report.pdf');
      toast.success('PDF report downloaded');
    } catch {}
  };

  if (loading) return <PageLoader />;

  const TABS = ['overview', 'violations', 'production', 'ranking'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><FiBarChart2 className="text-primary-600" /> Analytics</h1>
          <p className="page-subtitle">Interactive data insights across all mines and parameters</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadPDF} className="btn-outline"><FiDownload size={16} /> PDF Report</button>
          <button onClick={downloadExcel} className="btn-primary"><FiDownload size={16} /> Excel Export</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-coal-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={clsx('px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all', activeTab === tab ? 'bg-white text-coal-900 shadow-sm' : 'text-coal-500 hover:text-coal-700')}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Compliance trend */}
          <div className="card">
            <h3 className="section-title">Violation Trends (12 Months)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="violations" stroke="#3b82f6" strokeWidth={2} name="Total Violations" />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" />
                <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} strokeDasharray="4 2" name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Violation by severity & type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="section-title">Violations by Severity</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={violation?.bySeverity || []} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={80} label={({ severity, count }) => `${severity}: ${count}`}>
                    {(violation?.bySeverity || []).map((_, i) => <Cell key={i} fill={['#ef4444','#f59e0b','#3b82f6','#22c55e'][i % 4]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="section-title">Violations by Type</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(violation?.byType || []).slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="section-title">Violations by State</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={violation?.byState || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Violations" radius={[4,4,0,0]} />
                <Bar dataKey="avg_compliance" fill="#22c55e" name="Avg Compliance %" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'production' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="section-title">Mine Production vs Capacity</h3>
            <div className="space-y-3">
              {production.map(mine => (
                <div key={mine.name} className="p-4 rounded-lg bg-coal-50">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-sm font-semibold text-coal-800">{mine.name}</span>
                      <span className="text-xs text-coal-400 ml-2">({mine.state})</span>
                    </div>
                    <span className={clsx('text-sm font-bold', parseFloat(mine.capacity_utilization) >= 90 ? 'text-green-600' : parseFloat(mine.capacity_utilization) >= 70 ? 'text-yellow-600' : 'text-red-600')}>
                      {parseFloat(mine.capacity_utilization || 0).toFixed(1)}% utilization
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-coal-500 mb-2">
                    <span>Actual: <strong>{formatMT(mine.current_production_mt)}</strong></span>
                    <span>Capacity: <strong>{formatMT(mine.production_capacity_mt)}</strong></span>
                    <span>Workers: <strong>{mine.workers_count?.toLocaleString()}</strong></span>
                  </div>
                  <div className="w-full bg-coal-200 rounded-full h-2 overflow-hidden">
                    <div className={clsx('h-full rounded-full', parseFloat(mine.capacity_utilization) >= 90 ? 'bg-green-500' : parseFloat(mine.capacity_utilization) >= 70 ? 'bg-yellow-500' : 'bg-red-500')}
                      style={{ width: `${Math.min(100, mine.capacity_utilization || 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ranking' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="section-title">Mine Compliance Ranking</h3>
            <div className="space-y-3">
              {ranking.map((mine, i) => (
                <div key={mine.id} className={clsx('p-4 rounded-xl border', mine.status === 'suspended' ? 'border-red-200 bg-red-50' : mine.status === 'under_inspection' ? 'border-yellow-200 bg-yellow-50' : 'border-coal-200 bg-white')}>
                  <div className="flex items-center gap-4">
                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0', i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-coal-100 text-coal-600')}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-coal-900 text-sm">{mine.name}</span>
                        <span className="text-xs text-coal-400">{mine.state}</span>
                        <Badge color={mine.status === 'active' ? 'green' : mine.status === 'suspended' ? 'red' : 'yellow'}>{mine.status}</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div><p className="text-[10px] text-coal-400">Compliance</p><ScoreBar score={mine.compliance_score} showLabel={false} height="h-1" /></div>
                        <div><p className="text-[10px] text-coal-400">Safety</p><ScoreBar score={mine.safety_score} showLabel={false} height="h-1" /></div>
                        <div><p className="text-[10px] text-coal-400">Environment</p><ScoreBar score={mine.environmental_score} showLabel={false} height="h-1" /></div>
                        <div><p className="text-[10px] text-coal-400">Violations: {mine.open_violations} open</p></div>
                      </div>
                    </div>
                    <div className={clsx('text-2xl font-black', parseFloat(mine.compliance_score) >= 80 ? 'text-green-600' : parseFloat(mine.compliance_score) >= 60 ? 'text-yellow-600' : 'text-red-600')}>
                      {parseFloat(mine.compliance_score).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

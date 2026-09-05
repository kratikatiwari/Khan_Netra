import { useState, useEffect } from 'react';
import { FiShield, FiPlus, FiCpu, FiEdit2 } from 'react-icons/fi';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { complianceApi, minesApi } from '../../services/api';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import ScoreBar from '../../components/ui/ScoreBar';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_COLOR = { compliant: 'green', non_compliant: 'red', warning: 'yellow', pending: 'gray' };

export default function Compliance() {
  const [records, setRecords] = useState([]);
  const [mines, setMines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedMine, setSelectedMine] = useState('');
  const [mineScore, setMineScore] = useState(null);
  const [filters, setFilters] = useState({ status: '', category: '' });

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await complianceApi.getRecords({ mine_id: selectedMine, ...filters });
      setRecords(res.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchScore = async () => {
    if (!selectedMine) { setMineScore(null); return; }
    try {
      const res = await complianceApi.getMineScore(selectedMine);
      setMineScore(res.data);
    } catch {}
  };

  useEffect(() => { fetch(); fetchScore(); }, [selectedMine, filters]);
  useEffect(() => { minesApi.getAll({ limit: 100 }).then(r => setMines(r.data)).catch(() => {}); }, []);

  const runAI = async () => {
    if (!selectedMine) { toast.error('Select a mine first'); return; }
    setAiLoading(true);
    try {
      const res = await complianceApi.runAiAssessment(selectedMine);
      setAiResult(res.data);
    } catch {} finally { setAiLoading(false); }
  };

  const radarData = mineScore?.by_category?.map(c => ({
    subject: c.category.substring(0, 12),
    score: parseFloat(c.avg_score) || 0,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Compliance Monitoring</h1>
          <p className="page-subtitle">Track compliance across all regulatory categories</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAI} disabled={aiLoading} className="btn-outline">
            <FiCpu size={16} /> {aiLoading ? 'Analyzing...' : 'AI Assessment'}
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary"><FiPlus size={16} /> Add Record</button>
        </div>
      </div>

      {/* Mine selector + score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <label className="label">Filter by Mine</label>
          <select value={selectedMine} onChange={e => setSelectedMine(e.target.value)} className="select">
            <option value="">All Mines</option>
            {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {selectedMine && mineScore && (
            <div className="mt-3">
              <ScoreBar score={mineScore.overall_score} label="Overall Compliance Score" />
            </div>
          )}
        </div>
        {mineScore?.by_category?.length > 0 && (
          <div className="card lg:col-span-2">
            <h3 className="section-title mb-2">Compliance by Category</h3>
            <div className="flex gap-6">
              <ResponsiveContainer width="40%" height={150}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                  <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {mineScore.by_category.map(c => (
                  <div key={c.category}>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-xs text-coal-600">{c.category}</span>
                      <span className={clsx('text-xs font-bold', parseFloat(c.avg_score) >= 80 ? 'text-green-600' : parseFloat(c.avg_score) >= 60 ? 'text-yellow-600' : 'text-red-600')}>
                        {parseFloat(c.avg_score || 0).toFixed(1)}%
                      </span>
                    </div>
                    <ScoreBar score={c.avg_score} showLabel={false} height="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        {['', 'compliant', 'non_compliant', 'warning', 'pending'].map(s => (
          <button key={s} onClick={() => setFilters(p => ({ ...p, status: s }))}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
              filters.status === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-coal-600 border-coal-200 hover:bg-coal-50')}>
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
        <select value={filters.category} onChange={e => setFilters(p => ({ ...p, category: e.target.value }))} className="select w-40 ml-auto">
          <option value="">All Categories</option>
          {['Safety','Environmental','Labor','Operational','Documentation'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mine</th>
                <th>Category</th>
                <th>Parameter</th>
                <th>Required</th>
                <th>Actual</th>
                <th>Score</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td><span className="text-sm font-medium">{r.mine_name}</span></td>
                  <td><Badge color={r.category === 'Safety' ? 'red' : r.category === 'Environmental' ? 'green' : 'blue'}>{r.category}</Badge></td>
                  <td><span className="text-sm">{r.parameter_name}</span></td>
                  <td><span className="text-xs text-coal-500">{r.required_value || '—'}</span></td>
                  <td><span className="text-xs font-medium">{r.actual_value || '—'}</span></td>
                  <td>
                    <div className="w-16">
                      <span className={clsx('text-xs font-bold', parseFloat(r.score) >= 80 ? 'text-green-600' : parseFloat(r.score) >= 60 ? 'text-yellow-600' : 'text-red-600')}>{r.score}%</span>
                    </div>
                  </td>
                  <td><Badge color={STATUS_COLOR[r.status]}>{r.status.replace('_',' ')}</Badge></td>
                  <td>
                    <button onClick={() => { setEditItem(r); setShowForm(true); }} className="p-1.5 rounded hover:bg-coal-100 text-coal-500"><FiEdit2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Result Modal */}
      <Modal isOpen={!!aiResult} onClose={() => setAiResult(null)} title="AI Compliance Assessment" size="md">
        {aiResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={clsx('px-3 py-1.5 rounded-full text-sm font-bold',
                aiResult.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                aiResult.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                aiResult.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}>
                Risk Level: {aiResult.risk_level}
              </div>
              <span className="text-sm text-coal-500">Risk Score: <strong>{aiResult.risk_score}%</strong></span>
            </div>
            <p className="text-sm bg-coal-50 rounded-lg p-3">{aiResult.summary}</p>
            <div>
              <p className="text-xs font-bold text-coal-600 mb-2">RECOMMENDATIONS</p>
              <div className="space-y-2">
                {aiResult.recommendations.map((r, i) => (
                  <div key={i} className={clsx('flex items-start gap-2 p-2 rounded-lg text-xs',
                    r.priority === 'CRITICAL' ? 'bg-red-50' : r.priority === 'HIGH' ? 'bg-yellow-50' : 'bg-blue-50')}>
                    <Badge color={r.priority === 'CRITICAL' ? 'red' : r.priority === 'HIGH' ? 'yellow' : 'blue'} className="shrink-0 mt-0.5">{r.priority}</Badge>
                    <span>{r.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Update Compliance Record' : 'Add Compliance Record'} size="md">
        <ComplianceForm mines={mines} record={editItem} onSave={() => { setShowForm(false); setEditItem(null); fetch(); }} onCancel={() => { setShowForm(false); setEditItem(null); }} />
      </Modal>
    </div>
  );
}

function ComplianceForm({ mines, record, onSave, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: record || {} });
  const onSubmit = async (data) => {
    try {
      if (record?.id) { await complianceApi.update(record.id, data); toast.success('Updated'); }
      else { await complianceApi.create(data); toast.success('Record added'); }
      onSave();
    } catch {}
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!record && (
        <div className="form-group">
          <label className="label">Mine *</label>
          <select {...register('mine_id', { required: true })} className="select">
            <option value="">Select Mine</option>
            {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {!record && <>
          <div className="form-group">
            <label className="label">Category *</label>
            <select {...register('category', { required: true })} className="select">
              <option value="">Select</option>
              {['Safety','Environmental','Labor','Operational','Documentation'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group col-span-2">
            <label className="label">Parameter Name *</label>
            <input {...register('parameter_name', { required: true })} className="input" placeholder="Fire extinguisher inspection, Methane monitoring..." />
          </div>
          <div className="form-group">
            <label className="label">Required Value</label>
            <input {...register('required_value')} className="input" placeholder="Monthly inspection, <0.5%, Active system..." />
          </div>
        </>}
        <div className="form-group">
          <label className="label">Actual Value</label>
          <input {...register('actual_value')} className="input" />
        </div>
        <div className="form-group">
          <label className="label">Status</label>
          <select {...register('status')} className="select">
            <option value="pending">Pending</option>
            <option value="compliant">Compliant</option>
            <option value="non_compliant">Non-Compliant</option>
            <option value="warning">Warning</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label">Score (0-100)</label>
          <input type="number" min="0" max="100" {...register('score')} className="input" />
        </div>
        <div className="form-group col-span-2">
          <label className="label">Notes</label>
          <textarea {...register('notes')} rows={2} className="input resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Save Record'}</button>
      </div>
    </form>
  );
}

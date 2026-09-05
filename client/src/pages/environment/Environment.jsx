import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiPlus, FiAlertTriangle, FiWind, FiDroplet, FiActivity } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { environmentApi, minesApi } from '../../services/api';
import { formatDateTime, formatDate } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const PARAMS = ['PM10','PM2.5','SO2','NO2','CH4','CO','pH','TDS','Noise','Dust'];
const READING_TYPES = ['Air Quality','Water Quality','Noise','Dust','Gas Monitoring'];
const STATUS_COLOR = { normal: 'green', warning: 'yellow', critical: 'red', alert: 'orange' };
const STATUS_BG = { normal: 'bg-green-50 border-green-200', warning: 'bg-yellow-50 border-yellow-200', critical: 'bg-red-50 border-red-200', alert: 'bg-orange-50 border-orange-200' };

export default function Environment() {
  const [searchParams] = useSearchParams();
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [mines, setMines] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMine, setSelectedMine] = useState(searchParams.get('mine_id') || '');
  const [selectedParam, setSelectedParam] = useState('PM10');
  const [filters, setFilters] = useState({ reading_type: '', status: '', mine_id: searchParams.get('mine_id') || '' });

  const fetch = async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([
        environmentApi.getReadings({ ...filters, limit: 50 }),
        environmentApi.getAlerts(),
      ]);
      setReadings(r.data);
      setAlerts(a.data);
    } catch {} finally { setLoading(false); }
  };

  const fetchTrends = async () => {
    if (!selectedMine || !selectedParam) return;
    try {
      const res = await environmentApi.getTrends({ mine_id: selectedMine, parameter: selectedParam, days: 7 });
      setTrends(res.data.map(t => ({ time: new Date(t.time).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }), avg: parseFloat(t.avg_value).toFixed(2), max: parseFloat(t.max_value).toFixed(2) })));
    } catch {}
  };

  useEffect(() => { fetch(); minesApi.getAll({ limit: 100 }).then(r => setMines(r.data)).catch(() => {}); }, [filters]);
  useEffect(() => { fetchTrends(); }, [selectedMine, selectedParam]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Environmental Monitoring</h1>
          <p className="page-subtitle">Real-time air, water and noise quality tracking</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><FiPlus size={16} /> Add Reading</button>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="card border-l-4 border-red-500">
          <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2"><FiAlertTriangle /> Active Environmental Alerts ({alerts.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.slice(0, 6).map(a => (
              <div key={a.id} className={clsx('p-3 rounded-lg border text-sm', STATUS_BG[a.status] || 'bg-yellow-50 border-yellow-200')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-coal-800">{a.parameter}</span>
                  <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
                </div>
                <p className="text-xs text-coal-600">{a.mine_name}</p>
                <p className="text-xs font-semibold mt-1">{parseFloat(a.value).toFixed(2)} {a.unit} <span className="font-normal text-coal-400">(max: {a.threshold_max} {a.unit})</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h3 className="section-title mb-0 flex-1">Parameter Trend</h3>
          <select value={selectedMine} onChange={e => setSelectedMine(e.target.value)} className="select w-48">
            <option value="">Select Mine</option>
            {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={selectedParam} onChange={e => setSelectedParam(e.target.value)} className="select w-32">
            {PARAMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} name="Avg" dot={false} />
              <Line type="monotone" dataKey="max" stroke="#ef4444" strokeWidth={2} name="Max" dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-coal-300 text-sm">Select a mine and parameter to view trend</div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select value={filters.mine_id} onChange={e => setFilters(p => ({ ...p, mine_id: e.target.value }))} className="select w-48">
          <option value="">All Mines</option>
          {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filters.reading_type} onChange={e => setFilters(p => ({ ...p, reading_type: e.target.value }))} className="select w-44">
          <option value="">All Types</option>
          {READING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="select w-36">
          <option value="">All Status</option>
          {['normal','warning','critical','alert'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>

      {/* Readings Table */}
      {loading ? <PageLoader /> : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mine</th>
                <th>Parameter</th>
                <th>Value</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Location</th>
                <th>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {readings.map(r => (
                <tr key={r.id}>
                  <td><p className="font-medium text-sm">{r.mine_name}</p></td>
                  <td>
                    <div className="flex items-center gap-2">
                      {r.reading_type === 'Air Quality' ? <FiWind size={14} className="text-blue-400" /> : <FiDroplet size={14} className="text-blue-400" />}
                      <span className="text-sm font-medium">{r.parameter}</span>
                    </div>
                  </td>
                  <td>
                    <span className={clsx('text-sm font-bold', r.status === 'critical' ? 'text-red-600' : r.status === 'warning' ? 'text-yellow-600' : 'text-green-600')}>
                      {parseFloat(r.value).toFixed(2)} {r.unit}
                    </span>
                  </td>
                  <td><span className="text-xs text-coal-400">0 – {r.threshold_max} {r.unit}</span></td>
                  <td><Badge color={STATUS_COLOR[r.status]}>{r.status}</Badge></td>
                  <td><span className="text-xs text-coal-500">{r.location || '—'}</span></td>
                  <td><span className="text-xs text-coal-500">{formatDateTime(r.recorded_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Reading Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Environmental Reading" size="md">
        <ReadingForm mines={mines} onSave={() => { setShowForm(false); fetch(); }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

function ReadingForm({ mines, onSave, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const onSubmit = async (data) => {
    try {
      await environmentApi.createReading(data);
      toast.success('Reading recorded');
      onSave();
    } catch {}
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="label">Mine *</label>
          <select {...register('mine_id', { required: true })} className="select">
            <option value="">Select Mine</option>
            {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Reading Type *</label>
          <select {...register('reading_type', { required: true })} className="select">
            <option value="">Select Type</option>
            {READING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Parameter *</label>
          <select {...register('parameter', { required: true })} className="select">
            <option value="">Select Parameter</option>
            {PARAMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Value *</label>
          <input type="number" step="0.001" {...register('value', { required: true })} className="input" />
        </div>
        <div className="form-group">
          <label className="label">Unit</label>
          <input {...register('unit')} className="input" placeholder="μg/m³, %, ppm..." />
        </div>
        <div className="form-group">
          <label className="label">Location</label>
          <input {...register('location')} className="input" placeholder="Mine entrance, Loading point..." />
        </div>
        <div className="form-group col-span-2">
          <label className="label">Notes</label>
          <textarea {...register('notes')} rows={2} className="input resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Saving...' : 'Record Reading'}</button>
      </div>
    </form>
  );
}

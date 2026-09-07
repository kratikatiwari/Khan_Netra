import { useState, useEffect } from 'react';
import { FiShield, FiPlus, FiCpu, FiEdit2, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { complianceApi, minesApi } from '../../services/api';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import ScoreBar from '../../components/ui/ScoreBar';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const STATUS_COLOR = { compliant:'green', non_compliant:'red', warning:'yellow', pending:'gray' };

export default function Compliance() {
  const [records,    setRecords]    = useState([]);
  const [mines,      setMines]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [aiResult,   setAiResult]   = useState(null);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editItem,   setEditItem]   = useState(null);
  const [selMine,    setSelMine]    = useState('');
  const [mineScore,  setMineScore]  = useState(null);
  const [filters,    setFilters]    = useState({ status:'', category:'' });

  const load = async () => {
    setLoading(true);
    try { const r = await complianceApi.getRecords({ mine_id:selMine, ...filters }); setRecords(r.data); }
    catch {} finally { setLoading(false); }
  };

  const loadScore = async () => {
    if (!selMine) { setMineScore(null); return; }
    try { const r = await complianceApi.getMineScore(selMine); setMineScore(r.data); } catch {}
  };

  useEffect(() => { load(); loadScore(); }, [selMine, filters]);
  useEffect(() => { minesApi.getAll({ limit:100 }).then(r=>setMines(r.data)).catch(()=>{}); }, []);

  const runAI = async () => {
    if (!selMine) { toast.error('Select a mine first'); return; }
    setAiLoading(true);
    try { const r = await complianceApi.runAiAssessment(selMine); setAiResult(r.data); }
    catch {} finally { setAiLoading(false); }
  };

  const radarData = mineScore?.by_category?.map(c => ({ subject: c.category.substring(0,10), score: parseFloat(c.avg_score)||0 })) || [];
  const RISK_STYLE = {
    CRITICAL: 'bg-danger-600/15 border-danger-500/30 text-danger-400',
    HIGH:     'bg-amber-500/15  border-amber-500/30  text-amber-400',
    MEDIUM:   'bg-info-600/15   border-info-500/30   text-info-400',
    LOW:      'bg-success-600/15 border-success-500/30 text-success-400',
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><FiShield className="text-amber-400"/> Compliance Monitor</h1>
          <p className="page-subtitle">Parameter-level compliance tracking across all regulatory categories</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAI} disabled={aiLoading} className="btn-outline">
            <FiCpu size={15}/> {aiLoading ? 'Analyzing…' : 'AI Assessment'}
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary"><FiPlus size={15}/> Add Record</button>
        </div>
      </div>

      {/* Mine selector + score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card">
          <label className="label">Filter by Mine</label>
          <select value={selMine} onChange={e => setSelMine(e.target.value)} className="select">
            <option value="">All Mines</option>
            {mines.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {selMine && mineScore && (
            <div className="mt-4">
              <ScoreBar score={mineScore.overall_score} label="Overall Compliance" />
            </div>
          )}
        </div>
        {mineScore?.by_category?.length > 0 && (
          <div className="card lg:col-span-2 flex gap-6">
            <ResponsiveContainer width="40%" height={160}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#343a40"/>
                <PolarAngleAxis dataKey="subject" tick={{ fontSize:9, fill:'#6c757d' }}/>
                <Radar dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={1.5}/>
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 py-2">
              {mineScore.by_category.map(c => (
                <div key={c.category}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-coal-500">{c.category}</span>
                    <span className={clsx('text-[11px] font-bold', parseFloat(c.avg_score)>=80?'text-success-400':parseFloat(c.avg_score)>=60?'text-amber-400':'text-danger-400')}>
                      {parseFloat(c.avg_score||0).toFixed(0)}%
                    </span>
                  </div>
                  <ScoreBar score={c.avg_score} showLabel={false} height="h-1"/>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status filters */}
      <div className="tab-bar">
        {['','compliant','non_compliant','warning','pending'].map(s => (
          <button key={s} onClick={() => setFilters(p=>({...p, status:s}))}
            className={clsx('tab-item', filters.status===s && 'active')}>
            {s==='' ? 'All' : s.replace('_',' ')}
          </button>
        ))}
        <select value={filters.category} onChange={e => setFilters(p=>({...p, category:e.target.value}))} className="select w-36 ml-auto text-[12px]">
          <option value="">All Categories</option>
          {['Safety','Environmental','Labor','Operational','Documentation'].map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <PageLoader/> : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Mine</th><th>Category</th><th>Parameter</th><th>Required</th><th>Actual</th><th>Score</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td><span className="text-sm font-semibold text-coal-200">{r.mine_name}</span></td>
                  <td><Badge color={r.category==='Safety'?'red':r.category==='Environmental'?'green':'blue'}>{r.category}</Badge></td>
                  <td><span className="text-sm text-coal-300">{r.parameter_name}</span></td>
                  <td><span className="text-xs text-coal-600">{r.required_value||'—'}</span></td>
                  <td><span className="text-xs font-semibold text-coal-300">{r.actual_value||'—'}</span></td>
                  <td>
                    <span className={clsx('text-sm font-black', parseFloat(r.score)>=80?'text-success-400':parseFloat(r.score)>=60?'text-amber-400':'text-danger-400')}>
                      {r.score}%
                    </span>
                  </td>
                  <td><Badge color={STATUS_COLOR[r.status]}>{r.status.replace('_',' ')}</Badge></td>
                  <td>
                    <button onClick={() => { setEditItem(r); setShowForm(true); }}
                      className="p-1.5 rounded-lg text-coal-600 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                      <FiEdit2 size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Modal */}
      <Modal isOpen={!!aiResult} onClose={() => setAiResult(null)} title="AI Compliance Assessment" size="md">
        {aiResult && (
          <div className="space-y-4">
            <div className={clsx('p-4 rounded-xl border', RISK_STYLE[aiResult.risk_level] || RISK_STYLE.LOW)}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-black text-lg">{aiResult.risk_level}</span>
                <span className="text-2xl font-black">{aiResult.risk_score}%</span>
              </div>
              <p className="text-xs opacity-70">{aiResult.mine_name}</p>
            </div>
            <div className="p-3 rounded-xl bg-coal-800/60 border border-coal-700/40">
              <p className="text-sm text-coal-300 leading-relaxed">{aiResult.summary}</p>
            </div>
            <div>
              <p className="text-[10px] text-coal-600 uppercase tracking-widest mb-2">Recommendations</p>
              <div className="space-y-2">
                {aiResult.recommendations.map((r,i) => (
                  <div key={i} className={clsx('flex items-start gap-2 p-3 rounded-xl text-sm border',
                    r.priority==='CRITICAL'?'bg-danger-600/10 border-danger-500/25 text-danger-300':
                    r.priority==='HIGH'?'bg-amber-500/10 border-amber-500/25 text-amber-300':
                    'bg-info-600/10 border-info-500/25 text-info-300')}>
                    <Badge color={r.priority==='CRITICAL'?'red':r.priority==='HIGH'?'yellow':'blue'}>{r.priority}</Badge>
                    <span>{r.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem?'Update Record':'Add Compliance Record'} size="md">
        <ComplianceForm mines={mines} record={editItem} onSave={() => { setShowForm(false); setEditItem(null); load(); }} onCancel={() => { setShowForm(false); setEditItem(null); }}/>
      </Modal>
    </div>
  );
}

function ComplianceForm({ mines, record, onSave, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: record||{} });
  const onSubmit = async (data) => {
    try {
      if (record?.id) { await complianceApi.update(record.id, data); toast.success('Updated'); }
      else            { await complianceApi.create(data);            toast.success('Record added'); }
      onSave();
    } catch {}
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!record && (
        <div className="form-group">
          <label className="label">Mine *</label>
          <select {...register('mine_id',{required:true})} className="select"><option value="">Select Mine</option>{mines.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {!record && <>
          <div className="form-group"><label className="label">Category *</label><select {...register('category',{required:true})} className="select"><option value="">Select</option>{['Safety','Environmental','Labor','Operational','Documentation'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          <div className="form-group col-span-2"><label className="label">Parameter *</label><input {...register('parameter_name',{required:true})} className="input" placeholder="Fire extinguisher inspection…"/></div>
          <div className="form-group"><label className="label">Required Value</label><input {...register('required_value')} className="input" placeholder="Monthly inspection…"/></div>
        </>}
        <div className="form-group"><label className="label">Actual Value</label><input {...register('actual_value')} className="input"/></div>
        <div className="form-group"><label className="label">Status</label><select {...register('status')} className="select"><option value="pending">Pending</option><option value="compliant">Compliant</option><option value="non_compliant">Non-Compliant</option><option value="warning">Warning</option></select></div>
        <div className="form-group"><label className="label">Score (0-100)</label><input type="number" min="0" max="100" {...register('score')} className="input"/></div>
        <div className="form-group col-span-2"><label className="label">Notes</label><textarea {...register('notes')} rows={2} className="input resize-none"/></div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t border-coal-700/50">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting?'Saving…':'Save Record'}</button>
      </div>
    </form>
  );
}

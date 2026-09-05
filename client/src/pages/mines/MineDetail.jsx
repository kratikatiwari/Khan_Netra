import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiEdit2, FiWind, FiFileText, FiAlertCircle,
  FiAlertTriangle, FiClipboard, FiCpu, FiMapPin
} from 'react-icons/fi';
import {
  minesApi, violationsApi, incidentsApi,
  environmentApi, inspectionsApi, documentsApi
} from '../../services/api';
import { formatDate, formatMT, scoreToColor, getStatusColor } from '../../utils/helpers';
import ScoreBar from '../../components/ui/ScoreBar';
import Badge from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import MineForm from './MineForm';
import MineMap from './MineMap';
import useAuthStore from '../../store/authStore';
import clsx from 'clsx';

const SEV = { critical:'red', fatal:'red', high:'yellow', serious:'yellow', medium:'blue', minor:'blue', low:'green', near_miss:'gray' };
const VSTS = { open:'red', under_review:'yellow', action_taken:'blue', closed:'green', appealed:'purple' };

export default function MineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [mine, setMine]           = useState(null);
  const [violations, setViolations] = useState([]);
  const [incidents, setIncidents]   = useState([]);
  const [envLatest, setEnvLatest]   = useState([]);
  const [inspections, setInspections] = useState([]);
  const [documents, setDocuments]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState('overview');
  const [showEdit, setShowEdit]     = useState(false);

  const canEdit = ['admin','government_officer','mine_manager'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [m, v, inc, env, ins, docs] = await Promise.all([
        minesApi.getById(id),
        violationsApi.getAll({ mine_id: id, limit: 15 }),
        incidentsApi.getAll({ mine_id: id, limit: 15 }),
        environmentApi.getLatestByMine(id),
        inspectionsApi.getAll({ mine_id: id, limit: 15 }),
        documentsApi.getAll({ mine_id: id, limit: 15 }),
      ]);
      setMine(m.data);
      setViolations(v.data || []);
      setIncidents(inc.data || []);
      setEnvLatest(env.data || []);
      setInspections(ins.data || []);
      setDocuments(docs.data || []);
    } catch { navigate('/mines'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <PageLoader message="Loading mine details…" />;
  if (!mine) return null;

  const TABS = [
    { id:'overview',     label:'Overview' },
    { id:'violations',   label:`Violations (${violations.length})` },
    { id:'incidents',    label:`Incidents (${incidents.length})` },
    { id:'environment',  label:'Environment' },
    { id:'inspections',  label:`Inspections (${inspections.length})` },
    { id:'documents',    label:`Documents (${documents.length})` },
  ];

  const scores = [
    { label:'Compliance', value: mine.compliance_score },
    { label:'Safety',     value: mine.safety_score },
    { label:'Environment',value: mine.environmental_score },
    { label:'Risk Score', value: mine.risk_score, inverted: true },
  ];

  const licenceExpired = mine.license_expiry && new Date(mine.license_expiry) < new Date();
  const licenceSoon    = !licenceExpired && mine.license_expiry && new Date(mine.license_expiry) < new Date(Date.now() + 90*864e5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/mines" className="flex items-center gap-1 text-sm text-coal-400 hover:text-primary-600 mb-2">
            <FiArrowLeft size={14}/> Back to Mines
          </Link>
          <h1 className="page-title">{mine.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm text-coal-500 font-mono">{mine.mine_id}</span>
            <span className="text-coal-300">·</span>
            <Badge color={mine.type==='Underground'?'blue':'green'}>{mine.type}</Badge>
            <Badge color={getStatusColor(mine.status)} dot>{mine.status.replace(/_/g,' ')}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && <button onClick={()=>setShowEdit(true)} className="btn-outline"><FiEdit2 size={15}/> Edit</button>}
          <Link to={`/ai/risk?mine=${id}`} className="btn-primary"><FiCpu size={15}/> AI Risk Analysis</Link>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {scores.map(sc => {
          const val = parseFloat(sc.value||0);
          const disp = sc.inverted ? 100-val : val;
          return (
            <div key={sc.label} className="card">
              <p className="text-xs font-semibold text-coal-500 mb-2">{sc.label}</p>
              <p className={clsx('text-3xl font-black mb-2', scoreToColor(disp))}>{val.toFixed(1)}%</p>
              <ScoreBar score={disp} showLabel={false}/>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-coal-100 p-1 rounded-xl w-fit">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={clsx('px-3 py-2 rounded-lg text-xs font-semibold transition-all',
              tab===t.id?'bg-white text-coal-900 shadow-sm':'text-coal-500 hover:text-coal-700')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==='overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="section-title">Mine Information</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['State / District', `${mine.state}, ${mine.district}`],
                ['Location',         mine.location_name],
                ['Area',             mine.area_hectares ? `${mine.area_hectares} ha` : '—'],
                ['Depth',            mine.depth_meters  ? `${mine.depth_meters} m`  : '—'],
                ['Mining Method',    mine.mining_method || '—'],
                ['Established',      mine.established_year || '—'],
                ['Workers',          mine.workers_count?.toLocaleString() || '—'],
                ['Primary Mineral',  mine.primary_mineral || 'Coal'],
                ['Production (Act.)',formatMT(mine.current_production_mt)],
                ['Capacity',         formatMT(mine.production_capacity_mt)],
              ].map(([k,v])=>(
                <div key={k}>
                  <dt className="text-xs text-coal-400">{k}</dt>
                  <dd className="font-medium text-coal-800">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-4">
            <div className="card">
              <h3 className="section-title">Owner & Contact</h3>
              <div className="space-y-2 text-sm">
                {[['Owner',mine.owner_name],['Company',mine.owner_company],['Email',mine.contact_email||'—'],['Phone',mine.contact_phone||'—']].map(([k,v])=>(
                  <div key={k}><p className="text-xs text-coal-400">{k}</p><p className="font-medium">{v}</p></div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3 className="section-title">License & Inspection</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-coal-400">License #</p>
                  <p className="font-mono text-xs font-semibold">{mine.license_number||'—'}</p>
                </div>
                <div>
                  <p className="text-xs text-coal-400">License Expiry</p>
                  <p className={clsx('text-xs font-medium',
                    licenceExpired?'text-red-600 font-bold':licenceSoon?'text-yellow-600':'text-coal-700')}>
                    {formatDate(mine.license_expiry)}
                    {licenceExpired && ' ⚠️ EXPIRED'}
                    {licenceSoon && !licenceExpired && ' ⚠️ Soon'}
                  </p>
                </div>
                <div><p className="text-xs text-coal-400">Last Inspected</p><p className="text-xs">{formatDate(mine.last_inspection_date)||'—'}</p></div>
                <div><p className="text-xs text-coal-400">Next Inspection</p><p className="text-xs">{formatDate(mine.next_inspection_date)||'—'}</p></div>
              </div>
            </div>
          </div>

          {mine.latitude && mine.longitude && (
            <div className="card p-0 overflow-hidden lg:col-span-2" style={{height:'280px'}}>
              <MineMap mines={[mine]}/>
            </div>
          )}
        </div>
      )}

      {/* ── VIOLATIONS ── */}
      {tab==='violations' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="section-title mb-0">Violations</h3>
            <Link to={`/violations?mine_id=${id}`} className="btn-outline btn-sm">
              <FiAlertCircle size={13}/> Manage
            </Link>
          </div>
          {violations.length===0
            ? <div className="card text-center py-10 text-coal-400 text-sm">No violations recorded ✓</div>
            : <div className="table-container"><table className="table">
                <thead><tr><th>#</th><th>Category</th><th>Severity</th><th>Status</th><th>Fine</th><th>Detected</th></tr></thead>
                <tbody>
                  {violations.map(v=>(
                    <tr key={v.id}>
                      <td><span className="font-mono text-xs">{v.violation_number}</span></td>
                      <td><p className="text-sm font-medium">{v.category}</p><p className="text-[11px] text-coal-400">{v.type}</p></td>
                      <td><Badge color={SEV[v.severity]}>{v.severity}</Badge></td>
                      <td><Badge color={VSTS[v.status]} dot>{v.status.replace('_',' ')}</Badge></td>
                      <td><span className="text-sm">₹{Number(v.fine_amount||0).toLocaleString('en-IN')}</span></td>
                      <td><span className="text-xs text-coal-500">{formatDate(v.detected_date)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
          }
        </div>
      )}

      {/* ── INCIDENTS ── */}
      {tab==='incidents' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="section-title mb-0">Incidents</h3>
            <Link to={`/incidents?mine_id=${id}`} className="btn-outline btn-sm"><FiAlertTriangle size={13}/> Manage</Link>
          </div>
          {incidents.length===0
            ? <div className="card text-center py-10 text-coal-400 text-sm">No incidents recorded ✓</div>
            : <div className="table-container"><table className="table">
                <thead><tr><th>#</th><th>Type</th><th>Severity</th><th>Injuries/Fatal</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {incidents.map(i=>(
                    <tr key={i.id}>
                      <td><span className="font-mono text-xs">{i.incident_number}</span></td>
                      <td><span className="text-sm font-medium">{i.type}</span></td>
                      <td><Badge color={SEV[i.severity]}>{i.severity.replace('_',' ')}</Badge></td>
                      <td><span className={clsx('text-sm font-semibold', parseInt(i.fatalities_count)>0?'text-red-600':'text-coal-700')}>
                        {i.injuries_count} / {i.fatalities_count}
                      </span></td>
                      <td><span className="text-xs text-coal-500">{formatDate(i.incident_date)}</span></td>
                      <td><Badge color={i.status==='closed'?'green':'red'} dot>{i.status.replace(/_/g,' ')}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
          }
        </div>
      )}

      {/* ── ENVIRONMENT ── */}
      {tab==='environment' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="section-title mb-0">Latest Readings</h3>
            <Link to={`/environment?mine_id=${id}`} className="btn-outline btn-sm"><FiWind size={13}/> Manage</Link>
          </div>
          {envLatest.length===0
            ? <div className="card text-center py-10 text-coal-400 text-sm">No environmental readings recorded</div>
            : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {envLatest.map(r=>(
                  <div key={r.parameter} className={clsx('card p-4',
                    r.status==='critical'?'border-red-300 bg-red-50':
                    r.status==='warning'?'border-yellow-300 bg-yellow-50':'')}>
                    <div className="flex items-center gap-2 mb-2">
                      <FiWind size={13} className="text-coal-400"/>
                      <span className="text-xs font-semibold text-coal-600">{r.parameter}</span>
                    </div>
                    <p className={clsx('text-2xl font-black',
                      r.status==='critical'?'text-red-600':r.status==='warning'?'text-yellow-600':'text-green-600')}>
                      {parseFloat(r.value).toFixed(2)}
                    </p>
                    <p className="text-xs text-coal-400">{r.unit}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge color={r.status==='normal'?'green':r.status==='warning'?'yellow':'red'}>{r.status}</Badge>
                      <span className="text-[10px] text-coal-300">max {r.threshold_max}</span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── INSPECTIONS ── */}
      {tab==='inspections' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="section-title mb-0">Inspections</h3>
            <Link to={`/inspections?mine_id=${id}`} className="btn-outline btn-sm"><FiClipboard size={13}/> Manage</Link>
          </div>
          {inspections.length===0
            ? <div className="card text-center py-10 text-coal-400 text-sm">No inspections recorded</div>
            : <div className="table-container"><table className="table">
                <thead><tr><th>#</th><th>Type</th><th>Inspector</th><th>Scheduled</th><th>Score</th><th>Status</th></tr></thead>
                <tbody>
                  {inspections.map(ins=>(
                    <tr key={ins.id}>
                      <td><span className="font-mono text-xs">{ins.inspection_number}</span></td>
                      <td><span className="text-sm">{ins.type}</span></td>
                      <td><span className="text-sm">{ins.inspector_name||'—'}</span></td>
                      <td><span className="text-xs">{formatDate(ins.scheduled_date)}</span></td>
                      <td>
                        {ins.overall_score
                          ? <span className={clsx('text-sm font-bold',parseFloat(ins.overall_score)>=80?'text-green-600':parseFloat(ins.overall_score)>=60?'text-yellow-600':'text-red-600')}>
                              {parseFloat(ins.overall_score).toFixed(1)}%
                            </span>
                          : <span className="text-xs text-coal-300">—</span>}
                      </td>
                      <td><Badge color={ins.status==='completed'?'green':ins.status==='scheduled'?'blue':'gray'} dot>{ins.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
          }
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {tab==='documents' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="section-title mb-0">Documents</h3>
            <Link to={`/documents?mine_id=${id}`} className="btn-outline btn-sm"><FiFileText size={13}/> Manage</Link>
          </div>
          {documents.length===0
            ? <div className="card text-center py-10 text-coal-400 text-sm">No documents uploaded</div>
            : <div className="table-container"><table className="table">
                <thead><tr><th>Title</th><th>Type</th><th>Issuing Authority</th><th>Expiry</th><th>Status</th></tr></thead>
                <tbody>
                  {documents.map(doc=>(
                    <tr key={doc.id}>
                      <td><div className="flex items-center gap-2"><FiFileText size={13} className="text-coal-400 shrink-0"/><span className="text-sm font-medium">{doc.title}</span></div></td>
                      <td><Badge color="gray">{doc.type}</Badge></td>
                      <td><span className="text-xs text-coal-500">{doc.issuing_authority||'—'}</span></td>
                      <td><span className={clsx('text-xs font-medium',doc.status==='expired'?'text-red-600':doc.status==='expiring_soon'?'text-yellow-600':'text-coal-600')}>{formatDate(doc.expiry_date)}</span></td>
                      <td><Badge color={doc.status==='active'?'green':doc.status==='expired'?'red':'yellow'} dot>{doc.status.replace('_',' ')}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
          }
        </div>
      )}

      <Modal isOpen={showEdit} onClose={()=>setShowEdit(false)} title="Edit Mine" size="lg">
        <MineForm mine={mine} onSave={()=>{setShowEdit(false);load();}} onCancel={()=>setShowEdit(false)}/>
      </Modal>
    </div>
  );
}

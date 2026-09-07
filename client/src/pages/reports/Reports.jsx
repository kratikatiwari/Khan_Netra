import { useState, useEffect } from 'react';
import { FiActivity, FiDownload, FiFileText, FiBarChart2, FiAlertTriangle, FiWind, FiClipboard, FiMapPin } from 'react-icons/fi';
import { reportsApi, minesApi } from '../../services/api';
import { downloadBlob } from '../../utils/helpers';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TYPES = [
  { id:'compliance', label:'Compliance Report',      desc:'Overall compliance scores and status', icon:FiBarChart2,    color:'text-amber-400 bg-amber-500/15 border-amber-500/25'   },
  { id:'violations', label:'Violations Report',      desc:'All violations, fines and actions',    icon:FiAlertTriangle, color:'text-danger-400 bg-danger-600/15 border-danger-500/25' },
  { id:'incidents',  label:'Safety Incidents',        desc:'Accident summary with casualty data',  icon:FiActivity,     color:'text-safety-400 bg-safety-500/15 border-safety-500/25' },
  { id:'mine',       label:'Mine Status Report',      desc:'Comprehensive mine profile & perf.',   icon:FiMapPin,       color:'text-info-400 bg-info-600/15 border-info-500/25'       },
  { id:'environmental', label:'Environmental Report', desc:'Air, water quality & exceedances',    icon:FiWind,         color:'text-success-400 bg-success-600/15 border-success-500/25'},
  { id:'inspection', label:'Inspection Report',       desc:'Schedule, findings and scores',        icon:FiClipboard,    color:'text-purple-400 bg-purple-600/15 border-purple-500/25'  },
];

export default function Reports() {
  const [mines,    setMines]    = useState([]);
  const [selMine,  setSelMine]  = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');
  const [loading,  setLoading]  = useState({});

  useEffect(() => { minesApi.getAll({ limit:100 }).then(r=>setMines(r.data)).catch(()=>{}); }, []);

  const dlPDF = async (type) => {
    setLoading(p => ({...p, [`pdf_${type}`]:true}));
    try {
      const r = await reportsApi.downloadPDF({ type, mine_id:selMine, from_date:fromDate, to_date:toDate });
      downloadBlob(r, `KhanNetra-${type}-Report.pdf`);
      toast.success('PDF downloaded');
    } catch {} finally { setLoading(p => ({...p, [`pdf_${type}`]:false})); }
  };

  const dlExcel = async (type) => {
    setLoading(p => ({...p, [`xls_${type}`]:true}));
    try {
      const r = await reportsApi.downloadExcel({ type, mine_id:selMine });
      downloadBlob(r, `KhanNetra-${type}-Export.xlsx`);
      toast.success('Excel exported');
    } catch {} finally { setLoading(p => ({...p, [`xls_${type}`]:false})); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title flex items-center gap-2"><FiActivity className="text-amber-400"/> Reports</h1>
        <p className="page-subtitle">Generate PDF and Excel reports for all compliance and safety data</p>
      </div>

      {/* Filters */}
      <div className="card-sm">
        <p className="text-xs font-bold text-coal-500 uppercase tracking-widest mb-3">Report Filters (Optional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="form-group">
            <label className="label">Mine</label>
            <select value={selMine} onChange={e=>setSelMine(e.target.value)} className="select">
              <option value="">All Mines</option>
              {mines.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">From Date</label>
            <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="input"/>
          </div>
          <div className="form-group">
            <label className="label">To Date</label>
            <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="input"/>
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TYPES.map(rt => (
          <div key={rt.id} className="card hover:shadow-hover transition-all duration-200 group">
            <div className={clsx('w-10 h-10 rounded-xl border flex items-center justify-center mb-4', rt.color)}>
              <rt.icon size={18}/>
            </div>
            <h3 className="font-bold text-coal-100 mb-1">{rt.label}</h3>
            <p className="text-xs text-coal-600 mb-5">{rt.desc}</p>
            <div className="flex gap-2">
              <button onClick={() => dlPDF(rt.id)} disabled={loading[`pdf_${rt.id}`]}
                className="btn-primary btn-sm flex-1 justify-center">
                {loading[`pdf_${rt.id}`]
                  ? <><div className="w-3 h-3 border border-coal-900/40 border-t-coal-900 rounded-full animate-spin"/>PDF</>
                  : <><FiDownload size={12}/>PDF</>}
              </button>
              <button onClick={() => dlExcel(rt.id)} disabled={loading[`xls_${rt.id}`]}
                className="btn-outline btn-sm flex-1 justify-center">
                {loading[`xls_${rt.id}`]
                  ? <><div className="w-3 h-3 border border-coal-600 border-t-coal-300 rounded-full animate-spin"/>XLS</>
                  : <><FiDownload size={12}/>Excel</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* All-in-one export */}
      <div className="rounded-2xl border border-amber-500/25 p-6 bg-amber-500/5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-amber-400 text-lg">Full Data Export</h3>
            <p className="text-coal-500 text-sm">Download all data — mines, violations, incidents, compliance — in a single Excel workbook</p>
          </div>
          <button onClick={() => dlExcel('')} disabled={loading['xls_']} className="btn-primary btn-lg">
            <FiDownload size={18}/> {loading['xls_'] ? 'Exporting…' : 'Download All Data'}
          </button>
        </div>
      </div>
    </div>
  );
}

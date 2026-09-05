import { useState, useEffect } from 'react';
import { FiActivity, FiDownload, FiFileText, FiBarChart2, FiAlertTriangle, FiWind, FiClipboard } from 'react-icons/fi';
import { reportsApi, minesApi } from '../../services/api';
import { downloadBlob } from '../../utils/helpers';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const REPORT_TYPES = [
  { id: 'compliance', label: 'Compliance Report', description: 'Overall compliance scores and status for all mines', icon: FiBarChart2, color: 'blue' },
  { id: 'violations', label: 'Violations Report', description: 'All violations, corrective actions and fines', icon: FiAlertTriangle, color: 'red' },
  { id: 'incidents', label: 'Safety Incidents Report', description: 'Accident and incident summary with casualty data', icon: FiActivity, color: 'orange' },
  { id: 'environmental', label: 'Environmental Report', description: 'Air, water quality readings and exceedances', icon: FiWind, color: 'green' },
  { id: 'inspection', label: 'Inspection Report', description: 'Inspection schedule, findings and scores', icon: FiClipboard, color: 'purple' },
  { id: 'mine', label: 'Mine Status Report', description: 'Comprehensive mine profile and performance', icon: FiFileText, color: 'gray' },
];

export default function Reports() {
  const [mines, setMines] = useState([]);
  const [selectedMine, setSelectedMine] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState({});

  useEffect(() => { minesApi.getAll({ limit: 100 }).then(r => setMines(r.data)).catch(() => {}); }, []);

  const downloadPDF = async (type) => {
    setLoading(prev => ({ ...prev, [`pdf_${type}`]: true }));
    try {
      const res = await reportsApi.downloadPDF({ type, mine_id: selectedMine, from_date: fromDate, to_date: toDate });
      downloadBlob(res, `KhanNetra-${type}-Report.pdf`);
      toast.success('PDF report downloaded');
    } catch {} finally { setLoading(prev => ({ ...prev, [`pdf_${type}`]: false })); }
  };

  const downloadExcel = async (type) => {
    setLoading(prev => ({ ...prev, [`excel_${type}`]: true }));
    try {
      const res = await reportsApi.downloadExcel({ type, mine_id: selectedMine });
      downloadBlob(res, `KhanNetra-${type}-Export.xlsx`);
      toast.success('Excel exported');
    } catch {} finally { setLoading(prev => ({ ...prev, [`excel_${type}`]: false })); }
  };

  const colorMap = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', orange: 'bg-orange-50 text-orange-600', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600', gray: 'bg-coal-100 text-coal-600' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2"><FiActivity className="text-primary-600" /> Reports</h1>
        <p className="page-subtitle">Generate and download compliance, safety and analytics reports</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-coal-700 mb-3">Report Filters (Optional)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="form-group">
            <label className="label">Mine (leave blank for all)</label>
            <select value={selectedMine} onChange={e => setSelectedMine(e.target.value)} className="select">
              <option value="">All Mines</option>
              {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label">From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input" />
          </div>
          <div className="form-group">
            <label className="label">To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input" />
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map(rt => (
          <div key={rt.id} className="card hover:shadow-hover transition-shadow">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center mb-3', colorMap[rt.color])}>
              <rt.icon size={20} />
            </div>
            <h3 className="font-semibold text-coal-900 mb-1">{rt.label}</h3>
            <p className="text-xs text-coal-500 mb-4">{rt.description}</p>
            <div className="flex gap-2">
              <button
                onClick={() => downloadPDF(rt.id)}
                disabled={loading[`pdf_${rt.id}`]}
                className="btn-primary btn-sm flex-1 justify-center"
              >
                {loading[`pdf_${rt.id}`] ? (
                  <span className="flex items-center gap-1"><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> PDF</span>
                ) : (<><FiDownload size={13} /> PDF</>)}
              </button>
              <button
                onClick={() => downloadExcel(rt.id)}
                disabled={loading[`excel_${rt.id}`]}
                className="btn-outline btn-sm flex-1 justify-center"
              >
                {loading[`excel_${rt.id}`] ? (
                  <span className="flex items-center gap-1"><span className="w-3 h-3 border border-coal-400/30 border-t-coal-600 rounded-full animate-spin" /> Excel</span>
                ) : (<><FiDownload size={13} /> Excel</>)}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick download all */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Comprehensive Report</h3>
            <p className="text-primary-200 text-sm">Download all data in a single Excel workbook</p>
          </div>
          <button onClick={() => downloadExcel('')} disabled={loading['excel_']} className="bg-white text-primary-700 hover:bg-primary-50 font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors">
            <FiDownload size={16} /> {loading['excel_'] ? 'Exporting...' : 'Download All Data'}
          </button>
        </div>
      </div>
    </div>
  );
}

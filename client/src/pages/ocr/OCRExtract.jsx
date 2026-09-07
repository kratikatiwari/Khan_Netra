import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FiUpload, FiFileText, FiCpu, FiCheckCircle, FiAlertTriangle,
  FiCalendar, FiLink, FiShield, FiRefreshCw, FiCopy, FiCheck,
} from 'react-icons/fi';
import { minesApi, ocrApi } from '../../services/api';
import Badge from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';

const DOC_TYPES = [
  'License', 'Certificate', 'Permit', 'Inspection Report',
  'Environmental Clearance', 'Safety Certificate', 'Compliance Report', 'Other'
];

function ResultCard({ label, value, icon: Icon, className = '' }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = async () => {
    await navigator.clipboard.writeText(String(value));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className={clsx('p-3 rounded-xl bg-coal-800/60 border border-coal-700/40', className)}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={12} className="text-coal-500"/>}
          <p className="text-[10px] font-bold text-coal-500 uppercase tracking-widest">{label}</p>
        </div>
        <button onClick={copy} className="p-0.5 text-coal-700 hover:text-coal-400 transition-colors">
          {copied ? <FiCheck size={11} className="text-success-400"/> : <FiCopy size={11}/>}
        </button>
      </div>
      <p className="text-sm font-semibold text-coal-200 break-words">{value}</p>
    </div>
  );
}

export default function OCRExtract() {
  const [file,         setFile]         = useState(null);
  const [preview,      setPreview]       = useState(null);
  const [docType,      setDocType]       = useState('License');
  const [mineId,       setMineId]        = useState('');
  const [mines,        setMines]         = useState([]);
  const [extracting,   setExtracting]    = useState(false);
  const [result,       setResult]        = useState(null);
  const [minesLoaded,  setMinesLoaded]   = useState(false);

  // Lazy load mines
  const ensureMines = async () => {
    if (minesLoaded) return;
    try { const r = await minesApi.getAll({ limit: 100 }); setMines(r.data||[]); setMinesLoaded(true); }
    catch {}
  };

  const onDrop = useCallback((files) => {
    const f = files[0];
    if (!f) return;
    if (f.size > 10*1024*1024) { toast.error('File must be under 10 MB'); return; }
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
    ensureMines();
  }, [minesLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg':['.jpg','.jpeg'], 'image/png':['.png'], 'image/webp':['.webp'], 'application/pdf':['.pdf'] },
    maxFiles: 1,
  });

  const extract = async () => {
    if (!file) { toast.error('Please select a file first'); return; }
    setExtracting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('doc_type', docType);
      if (mineId) fd.append('mine_id', mineId);
      const res = await ocrApi.extract(fd);
      setResult(res);
      toast.success(`Extraction complete (${Math.round((res.data?.confidence||0)*100)}% confidence)`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Extraction failed');
    } finally { setExtracting(false); }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); };

  const d = result?.data;

  const statusColor = (s) => ({ compliant:'green', non_compliant:'red', pending:'yellow', unknown:'gray' }[s]||'gray');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title flex items-center gap-2">
          <FiCpu className="text-amber-400"/> OCR Document Extractor
        </h1>
        <p className="page-subtitle">
          Upload a license, certificate or inspection report — Gemini Vision extracts compliance information automatically
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Upload + Config */}
        <div className="space-y-4">

          {/* Drop zone */}
          <div {...getRootProps()} className={clsx(
            'rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer',
            'bg-coal-900/60 min-h-[260px] flex items-center justify-center',
            isDragActive ? 'border-amber-500/60 bg-amber-500/5' : 'border-coal-700 hover:border-amber-500/40',
            preview ? 'p-0 overflow-hidden' : 'p-8'
          )}>
            <input {...getInputProps()}/>
            {preview ? (
              <div className="relative w-full">
                <img src={preview} alt="Preview" className="w-full max-h-[400px] object-contain rounded-2xl"/>
                <button onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-coal-900/80 border border-coal-700 text-xs text-coal-400 hover:text-danger-400 transition-colors">
                  ✕ Remove
                </button>
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-coal-900/80 border border-coal-700">
                  <p className="text-xs text-coal-300 font-medium">{file?.name}</p>
                  <p className="text-[10px] text-coal-500">{(file?.size/1024).toFixed(0)} KB</p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-coal-800 border border-coal-700 flex items-center justify-center mx-auto mb-4">
                  <FiUpload size={26} className="text-coal-500"/>
                </div>
                <p className="font-bold text-coal-300 mb-1">Drop document here or click to browse</p>
                <p className="text-xs text-coal-600">JPEG, PNG, WebP · Max 10 MB</p>
                <p className="text-xs text-coal-700 mt-2">Supports: Licenses, Certificates, Inspection Reports, EC Documents</p>
              </div>
            )}
          </div>

          {/* Config */}
          <div className="card-sm grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Document Type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)} className="select">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Associate with Mine (optional)</label>
              <select value={mineId} onChange={e => setMineId(e.target.value)} onClick={ensureMines} className="select">
                <option value="">No association</option>
                {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <button onClick={extract} disabled={!file || extracting}
            className="btn-primary w-full justify-center py-3">
            {extracting ? (
              <><div className="w-4 h-4 border-2 border-coal-900/30 border-t-coal-900 rounded-full animate-spin"/>
                Gemini Vision extracting…</>
            ) : (
              <><FiCpu size={16}/> Extract Compliance Information</>
            )}
          </button>

          {extracting && (
            <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin shrink-0"/>
              <p className="text-xs text-amber-300">Analysing document with Gemini Vision… (10–20 seconds)</p>
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div>
          {!result && !extracting && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] rounded-2xl border border-dashed border-coal-700/60 bg-coal-900/40 text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-coal-800 border border-coal-700 flex items-center justify-center mb-4">
                <FiFileText size={26} className="text-coal-600"/>
              </div>
              <p className="font-bold text-coal-500 mb-1">Results will appear here</p>
              <p className="text-xs text-coal-700 max-w-xs">
                Upload a document and click Extract. Gemini Vision will identify document type, dates, conditions, and compliance status.
              </p>
            </div>
          )}

          {extracting && <div className="flex items-center justify-center min-h-[300px]"><PageLoader message="Extracting information…"/></div>}

          {result && d && (
            <div className="space-y-4 animate-fade-in">
              {/* Header badge */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge color="green">{d.document_type || docType}</Badge>
                  {d.confidence && (
                    <span className="text-xs text-coal-500">
                      {Math.round(d.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
                <button onClick={reset} className="btn-outline btn-sm"><FiRefreshCw size={13}/> Extract Another</button>
              </div>

              {/* Summary */}
              {d.summary && (
                <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/20">
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">AI Summary</p>
                  <p className="text-sm text-coal-300 leading-relaxed">{d.summary}</p>
                </div>
              )}

              {/* Key fields */}
              <div className="grid grid-cols-2 gap-2">
                <ResultCard label="Document Number" value={d.document_number} icon={FiFileText}/>
                <ResultCard label="Issuing Authority" value={d.issuing_authority} icon={FiShield}/>
                <ResultCard label="Holder / Company" value={d.holder_name}/>
                <ResultCard label="Mine Name" value={d.mine_name} icon={FiShield}/>
                <ResultCard label="Issue Date"  value={d.issue_date  ? formatDate(d.issue_date)  : null} icon={FiCalendar}/>
                <ResultCard label="Expiry Date" value={d.expiry_date ? formatDate(d.expiry_date) : null} icon={FiCalendar}
                  className={d.expiry_date && new Date(d.expiry_date) < new Date() ? 'border-danger-500/40 bg-danger-600/10' : ''}/>
              </div>

              {/* Key conditions */}
              {d.key_conditions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-coal-500 uppercase tracking-widest mb-2">Key Conditions</p>
                  <ul className="space-y-1.5">
                    {d.key_conditions.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-coal-300">
                        <FiCheckCircle size={12} className="text-success-400 shrink-0 mt-0.5"/>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Compliance items */}
              {d.compliance_items?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-coal-500 uppercase tracking-widest mb-2">Compliance Items</p>
                  <div className="space-y-2">
                    {d.compliance_items.map((ci, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-coal-800/50 border border-coal-700/40">
                        <span className="text-xs text-coal-300 flex-1">{ci.item}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {ci.deadline && <span className="text-[10px] text-coal-500">{formatDate(ci.deadline)}</span>}
                          <Badge color={statusColor(ci.status)}>{ci.status?.replace('_',' ')}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Violations mentioned */}
              {d.violations_mentioned?.length > 0 && (
                <div className="p-3 rounded-xl bg-danger-600/10 border border-danger-500/25">
                  <p className="text-[10px] font-bold text-danger-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <FiAlertTriangle size={11}/> Violations/Issues Mentioned
                  </p>
                  <ul className="space-y-1">
                    {d.violations_mentioned.map((v, i) => (
                      <li key={i} className="text-xs text-danger-300 flex items-start gap-1.5">
                        <span className="text-danger-500 shrink-0">•</span>{v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regulatory references */}
              {d.regulatory_references?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {d.regulatory_references.map((r, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-coal-700 text-coal-400 border border-coal-600">
                      {r}
                    </span>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {d.warnings?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Extraction Notes</p>
                  {d.warnings.map((w, i) => <p key={i} className="text-xs text-amber-400">{w}</p>)}
                </div>
              )}

              {/* Model info */}
              <p className="text-[10px] text-coal-700 text-right">Model: {result.model_used}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

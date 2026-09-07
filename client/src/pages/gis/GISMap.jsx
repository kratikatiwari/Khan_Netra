import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiLayers, FiMapPin, FiAlertTriangle, FiAlertCircle, FiNavigation, FiRefreshCw } from 'react-icons/fi';
import { riskApi, minesApi } from '../../services/api';
import Badge from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/helpers';
import clsx from 'clsx';
import toast from 'react-hot-toast';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

/* ── Icon factories ────────────────────────────────────────────────── */
const mkDot = (color, size = 16, label = '') => L.divIcon({
  className: '',
  html: `<div style="position:relative;width:${size}px;height:${size}px">
    <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid rgba(255,255,255,.85);box-shadow:0 0 10px ${color}70,0 2px 6px rgba(0,0,0,.5);"></div>
    ${label ? `<div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(0,0,0,.75);color:#fff;font-size:9px;padding:1px 4px;border-radius:3px;font-weight:700;">${label}</div>` : ''}
  </div>`,
  iconSize: [size, size], iconAnchor: [size / 2, size / 2],
});

const mineIcon = (status, score) => {
  const c = status === 'suspended' ? '#ef4444'
    : status === 'under_inspection' ? '#f59e0b'
    : parseFloat(score) < 60 ? '#f97316' : '#22c55e';
  return mkDot(c, 20);
};
const incidentIcon  = mkDot('#ef4444',  14);
const violationIcon = mkDot('#f97316',  12);
const fieldRepIcon  = mkDot('#8b5cf6',  12);

/* ── Layer toggle button ───────────────────────────────────────────── */
function LayerBtn({ active, color, icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all',
        active ? `${color} border-current` : 'bg-coal-800 text-coal-500 border-coal-700 hover:text-coal-300')}>
      <Icon size={13}/> {label}
    </button>
  );
}

export default function GISMap() {
  const [gisData,  setGisData]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [layers,   setLayers]   = useState({ mines:true, incidents:true, violations:true, fieldReports:true });
  const [mineFilter, setMineFilter] = useState('');
  const [mines, setMines] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [gis, ms] = await Promise.all([
        riskApi.getGis(mineFilter ? { mine_id: mineFilter } : {}),
        minesApi.getAll({ limit: 100 }),
      ]);
      setGisData(gis.data);
      setMines(ms.data || []);
    } catch (e) {
      toast.error('Failed to load GIS data');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [mineFilter]);

  const toggleLayer = (key) => setLayers(l => ({ ...l, [key]: !l[key] }));

  if (loading) return <PageLoader message="Loading GIS data…"/>;

  const mapMines       = (gisData?.mines         || []).filter(m => m.latitude && m.longitude);
  const mapFieldReps   = (gisData?.field_reports  || []).filter(r => r.latitude && r.longitude);

  // Center on first mine or India center
  const center = mapMines.length
    ? [mapMines.reduce((s, m) => s + parseFloat(m.latitude), 0) / mapMines.length,
       mapMines.reduce((s, m) => s + parseFloat(m.longitude), 0) / mapMines.length]
    : [22.5, 82.5];

  const counts = {
    mines:    mapMines.length,
    fieldRep: mapFieldReps.length,
  };

  const SEV_COLOR = { critical:'text-danger-400', high:'text-amber-400', fatal:'text-danger-400', serious:'text-amber-400' };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FiLayers className="text-amber-400"/> Enhanced GIS Map
          </h1>
          <p className="page-subtitle">
            Mines, field reports and safety data on a live map — {counts.mines} mines · {counts.fieldRep} field reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mineFilter} onChange={e => setMineFilter(e.target.value)} className="select w-48 text-sm">
            <option value="">All Mines</option>
            {mines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={load} className="btn-outline btn-sm"><FiRefreshCw size={13}/> Refresh</button>
        </div>
      </div>

      {/* Layer toggles */}
      <div className="flex flex-wrap gap-2">
        <LayerBtn active={layers.mines}        color="text-success-400"  icon={FiMapPin}      label={`Mines (${counts.mines})`}           onClick={() => toggleLayer('mines')}/>
        <LayerBtn active={layers.fieldReports} color="text-purple-400"   icon={FiNavigation}  label={`Field Reports (${counts.fieldRep})`} onClick={() => toggleLayer('fieldReports')}/>
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-coal-700/60 shadow-panel" style={{ height: '540px' }}>
        <MapContainer
          center={center} zoom={5}
          style={{ height: '100%', width: '100%', background: '#0d1117' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Mines layer */}
          {layers.mines && (
            <LayerGroup>
              {mapMines.map(m => (
                <Marker key={m.id} position={[parseFloat(m.latitude), parseFloat(m.longitude)]}
                  icon={mineIcon(m.status, m.compliance_score)}>
                  <Popup maxWidth={280}>
                    <div style={{ fontFamily:'Inter,sans-serif', fontSize:'12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                        <span style={{ background: m.status==='suspended'?'rgba(239,68,68,.2)':m.status==='active'?'rgba(34,197,94,.2)':'rgba(245,158,11,.2)', color: m.status==='suspended'?'#ef4444':m.status==='active'?'#22c55e':'#f59e0b', padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700 }}>
                          {m.status?.toUpperCase()}
                        </span>
                        <span style={{ color:'#6c757d', fontSize:10 }}>{m.mine_id}</span>
                      </div>
                      <p style={{ fontWeight:800, fontSize:14, marginBottom:4, color:'#f1f5f9' }}>{m.name}</p>
                      <p style={{ color:'#6c757d', marginBottom:8 }}>{m.state}</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, fontSize:11 }}>
                        <div><span style={{color:'#6c757d'}}>Compliance: </span><strong style={{color:parseFloat(m.compliance_score)>=80?'#22c55e':parseFloat(m.compliance_score)>=60?'#f59e0b':'#ef4444'}}>{parseFloat(m.compliance_score).toFixed(1)}%</strong></div>
                        <div><span style={{color:'#6c757d'}}>Risk: </span><strong style={{color:parseFloat(m.risk_score)>=70?'#ef4444':'#f59e0b'}}>{parseFloat(m.risk_score).toFixed(1)}%</strong></div>
                        <div><span style={{color:'#6c757d'}}>Open Violations: </span><strong style={{color:'#f1f5f9'}}>{m.open_violations||0}</strong></div>
                        <div><span style={{color:'#6c757d'}}>Open Incidents: </span><strong style={{color:'#f1f5f9'}}>{m.open_incidents||0}</strong></div>
                      </div>
                      {m.license_expiry && new Date(m.license_expiry) < new Date() && (
                        <p style={{color:'#ef4444',fontWeight:700,marginTop:8,fontSize:11}}>⛔ License EXPIRED: {formatDate(m.license_expiry)}</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </LayerGroup>
          )}

          {/* Field reports layer */}
          {layers.fieldReports && (
            <LayerGroup>
              {mapFieldReps.map(r => (
                <Marker key={r.id} position={[parseFloat(r.latitude), parseFloat(r.longitude)]} icon={fieldRepIcon}>
                  <Popup maxWidth={240}>
                    <div style={{ fontFamily:'Inter,sans-serif', fontSize:'12px' }}>
                      <span style={{ background:'rgba(139,92,246,.2)', color:'#a78bfa', padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:700, marginBottom:6, display:'inline-block' }}>
                        FIELD REPORT · {r.severity?.toUpperCase()}
                      </span>
                      <p style={{ fontWeight:700, color:'#f1f5f9', marginTop:6, marginBottom:4 }}>{r.title}</p>
                      <p style={{ color:'#6c757d', marginBottom:4 }}>{r.mine_name} · {r.location_name||'Unknown'}</p>
                      <p style={{ color:'#adb5bd', fontSize:11 }}>{r.report_type} · {formatDate(r.created_at)}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </LayerGroup>
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="card-sm flex flex-wrap gap-4 text-xs">
        <span className="font-bold text-coal-500 uppercase tracking-widest text-[10px]">Legend:</span>
        {[
          { color:'#22c55e', label:'Active Mine (High Compliance)' },
          { color:'#f97316', label:'Mine (Low Compliance)' },
          { color:'#ef4444', label:'Suspended Mine' },
          { color:'#f59e0b', label:'Under Inspection' },
          { color:'#8b5cf6', label:'Field Report' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span style={{ width:10, height:10, borderRadius:'50%', background:l.color, display:'inline-block', border:'2px solid rgba(255,255,255,.3)', boxShadow:`0 0 5px ${l.color}60` }}/>
            <span className="text-coal-400">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Mines on Map',      value: counts.mines,    color:'text-success-400' },
          { label:'Suspended',         value: mapMines.filter(m=>m.status==='suspended').length, color:'text-danger-400' },
          { label:'Field Reports',     value: counts.fieldRep, color:'text-purple-400' },
          { label:'Under Inspection',  value: mapMines.filter(m=>m.status==='under_inspection').length, color:'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={clsx('text-2xl font-black tabular-nums', s.color)}>{s.value}</p>
            <p className="text-[11px] text-coal-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

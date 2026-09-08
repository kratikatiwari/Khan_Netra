/**
 * KhanNetra – Real-Time Disaster Alert & Emergency Safety System
 * Sources: USGS (earthquakes) + Open-Meteo/IMD (weather)
 * Features: live alerts, siren, full-screen emergency, acknowledge/resolve, history, test button
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiAlertTriangle, FiAlertCircle, FiRefreshCw, FiCheckCircle,
  FiXCircle, FiClock, FiMapPin, FiActivity, FiZap, FiVolume2,
  FiVolumeX, FiInfo, FiBarChart2, FiShield,
} from 'react-icons/fi';
import { disasterApi } from '../../services/api';
import { formatDateTime, timeAgo } from '../../utils/helpers';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import clsx from 'clsx';

/* ── severity config ──────────────────────────────────────────────── */
const SEV = {
  CRITICAL: { color:'text-red-400',    bg:'bg-red-600/15 border-red-500/40',  badge:'red',    pulse:true  },
  HIGH:     { color:'text-orange-400', bg:'bg-orange-600/15 border-orange-500/35', badge:'orange', pulse:true  },
  MEDIUM:   { color:'text-amber-400',  bg:'bg-amber-500/15 border-amber-500/30', badge:'yellow', pulse:false },
  LOW:      { color:'text-blue-400',   bg:'bg-blue-600/10 border-blue-500/20',  badge:'blue',   pulse:false },
};

const TYPE_ICON = {
  'Earthquake':           '🌍',
  'Thunderstorm':         '⛈️',
  'Heavy Rainfall':       '🌧️',
  'Extreme Rainfall':     '🌊',
  'Heavy Rainfall / Flood Risk': '🌊',
  'Cyclonic Wind':        '🌀',
  'Severe Wind':          '💨',
  'Flood':                '🌊',
  'TEST – Earthquake':    '🧪',
};

const EVAC_INSTRUCTIONS = {
  Earthquake:  ['STOP all blasting and machinery immediately','Evacuate all underground workers via nearest exit','Move to open area away from high walls and slopes','Do not re-enter until stability assessment is complete','Contact DGMS Emergency: 1800-345-6789'],
  Flood:       ['Shut down all electrical equipment immediately','Evacuate low-lying areas and sump pits first','Move vehicles and equipment to higher ground','Seal all mine entries to prevent water ingress','Contact State Disaster Management Authority'],
  Cyclone:     ['Halt all open-cast and surface operations','Secure all loose equipment and structures','Move workers to reinforced shelter buildings','Stay away from highwalls, conveyors and towers','Monitor IMD alerts continuously'],
  Thunderstorm:['Stop all blasting operations immediately','Keep workers away from tall structures and trees','Ground all electrical equipment','Wait 30 minutes after last thunder before resuming','Inspect all electrical installations after storm'],
  default:     ['Halt all non-essential operations','Account for all personnel on site','Follow mine emergency response plan','Contact Mine Manager and Safety Officer immediately','Stand by for further instructions from DGMS'],
};

function getEvacInstructions(alertType) {
  for (const [key, val] of Object.entries(EVAC_INSTRUCTIONS)) {
    if (alertType?.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return EVAC_INSTRUCTIONS.default;
}

/* ── Web Audio siren ─────────────────────────────────────────────── */
function useSiren() {
  const ctxRef   = useRef(null);
  const activeRef= useRef(false);

  const play = useCallback(() => {
    if (activeRef.current) return;
    try {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current;
      activeRef.current = true;
      let t = ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t + i*1.2);
        osc.frequency.linearRampToValueAtTime(900, t + i*1.2 + 0.6);
        osc.frequency.linearRampToValueAtTime(300, t + i*1.2 + 1.2);
        gain.gain.setValueAtTime(0.35, t + i*1.2);
        gain.gain.setValueAtTime(0.0,  t + i*1.2 + 1.15);
        osc.start(t + i*1.2);
        osc.stop(t  + i*1.2 + 1.2);
      }
      setTimeout(() => { activeRef.current = false; }, 7500);
    } catch {}
  }, []);

  const stop = useCallback(() => {
    try { ctxRef.current?.close(); activeRef.current = false; }
    catch {}
  }, []);

  return { play, stop, active: activeRef };
}

/* ── Full-screen emergency overlay ────────────────────────────────── */
function EmergencyOverlay({ alert, onDismiss }) {
  const evac = getEvacInstructions(alert?.alert_type);
  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate([400,200,400,200,400]);
  }, []);

  if (!alert) return null;
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'rgba(0,0,0,.92)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px',
    }}>
      <div style={{
        maxWidth:'680px', width:'100%', borderRadius:'20px', padding:'36px',
        background: alert.severity === 'CRITICAL' ? 'rgba(239,68,68,.12)' : 'rgba(249,115,22,.10)',
        border: `2px solid ${alert.severity === 'CRITICAL' ? 'rgba(239,68,68,.6)' : 'rgba(249,115,22,.5)'}`,
        animation: 'kn-flash 1s ease-in-out 3',
      }}>
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <span style={{ fontSize:'52px', lineHeight:1 }}>{TYPE_ICON[alert.alert_type] || '⚠️'}</span>
          <div className="flex-1">
            {alert.is_test ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2"
                style={{ background:'rgba(245,158,11,.2)', border:'1px solid rgba(245,158,11,.5)' }}>
                <FiAlertCircle size={12} className="text-amber-400"/>
                <span style={{ color:'#fbbf24', fontSize:'11px', fontWeight:700 }}>🧪 TEST DRILL — NOT A REAL EMERGENCY</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2"
                style={{ background:'rgba(239,68,68,.2)', border:'1px solid rgba(239,68,68,.5)' }}>
                <span style={{ color:'#f87171', fontSize:'11px', fontWeight:700 }}>🚨 REAL EMERGENCY — TAKE IMMEDIATE ACTION</span>
              </div>
            )}
            <h2 style={{ color:'#f1f5f9', fontWeight:900, fontSize:'22px', margin:0, lineHeight:1.1 }}>
              {alert.severity} DISASTER ALERT
            </h2>
            <p style={{ color:'rgba(255,255,255,.7)', fontSize:'14px', margin:'6px 0 0' }}>{alert.title}</p>
          </div>
        </div>

        {/* Details */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' }}>
          {[
            ['Type', alert.alert_type],
            ['Location', alert.location_name || 'See details'],
            ['Time', formatDateTime(alert.alert_time)],
            ['Affected Mines', alert.affected_mines?.length ? `${alert.affected_mines.length} mine(s)` : 'Assessing…'],
          ].map(([k,v]) => (
            <div key={k} style={{ padding:'10px 14px', borderRadius:'10px', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)' }}>
              <p style={{ color:'rgba(255,255,255,.4)', fontSize:'10px', fontWeight:700, textTransform:'uppercase', margin:0 }}>{k}</p>
              <p style={{ color:'#f1f5f9', fontSize:'13px', fontWeight:700, margin:'3px 0 0' }}>{v}</p>
            </div>
          ))}
        </div>

        {/* Evacuation instructions */}
        <div style={{ padding:'16px', borderRadius:'12px', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', marginBottom:'20px' }}>
          <p style={{ color:'#fbbf24', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 10px' }}>
            🚁 Emergency Actions
          </p>
          {evac.map((e, i) => (
            <div key={i} className="flex items-start gap-2 mb-2">
              <span style={{ color:'#f59e0b', fontWeight:900, flexShrink:0 }}>{i+1}.</span>
              <span style={{ color:'rgba(255,255,255,.8)', fontSize:'13px' }}>{e}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onDismiss}
            style={{ flex:1, padding:'13px', borderRadius:'11px', fontWeight:800, fontSize:'14px', cursor:'pointer', border:'none',
                     background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#060e1c' }}>
            ✓ Acknowledge & Dismiss
          </button>
        </div>
      </div>
      <style>{`@keyframes kn-flash { 0%,100%{opacity:1} 50%{opacity:.7} }`}</style>
    </div>
  );
}

/* ── Alert Card ──────────────────────────────────────────────────── */
function AlertCard({ alert, onAcknowledge, onResolve, onViewDetails }) {
  const s = SEV[alert.severity] || SEV.LOW;
  return (
    <div className={clsx('rounded-2xl border p-4 transition-all', s.bg)}>
      <div className="flex items-start gap-3">
        <span style={{ fontSize:'26px', lineHeight:1, flexShrink:0 }}>{TYPE_ICON[alert.alert_type] || '⚠️'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {alert.is_test ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                style={{ background:'rgba(245,158,11,.2)', color:'#fbbf24', border:'1px solid rgba(245,158,11,.4)' }}>
                🧪 TEST DRILL
              </span>
            ) : null}
            <Badge color={s.badge}>{alert.severity}</Badge>
            <span className="text-xs text-coal-500">{alert.alert_type}</span>
            {s.pulse && alert.status === 'active' && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
            )}
          </div>
          <p className="text-sm font-bold text-coal-100 leading-tight mb-1">{alert.title}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-coal-500 mb-2">
            <span className="flex items-center gap-1"><FiMapPin size={10}/> {alert.location_name || '—'}</span>
            <span className="flex items-center gap-1"><FiClock size={10}/> {timeAgo(alert.alert_time)}</span>
            <span className="flex items-center gap-1"><FiActivity size={10}/> {alert.source}</span>
            {alert.magnitude && <span>M{parseFloat(alert.magnitude).toFixed(1)}</span>}
          </div>
          {/* Affected mines */}
          {alert.affected_mines?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {alert.affected_mines.slice(0,3).map((m,i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.6)', border:'1px solid rgba(255,255,255,.12)' }}>
                  {m.name}{m.distance ? ` (${m.distance}km)` : ''}
                </span>
              ))}
              {alert.affected_mines.length > 3 && (
                <span className="text-[10px] text-coal-600">+{alert.affected_mines.length-3} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button onClick={() => onViewDetails(alert)} className="btn-outline btn-xs flex-1 justify-center">
          <FiInfo size={12}/> Details
        </button>
        {alert.status === 'active' && (
          <button onClick={() => onAcknowledge(alert.id)}
            style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
              padding:'5px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:700,
              cursor:'pointer', background:'rgba(245,158,11,.15)',
              border:'1px solid rgba(245,158,11,.35)', color:'#fbbf24',
            }}>
            <FiCheckCircle size={12}/> Acknowledge
          </button>
        )}
        {['active','acknowledged'].includes(alert.status) && (
          <button onClick={() => onResolve(alert.id)}
            style={{
              flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'4px',
              padding:'5px 10px', borderRadius:'8px', fontSize:'11px', fontWeight:700,
              cursor:'pointer', background:'rgba(34,197,94,.12)',
              border:'1px solid rgba(34,197,94,.3)', color:'#4ade80',
            }}>
            <FiXCircle size={12}/> Resolve
          </button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════ */
export default function DisasterAlerts() {
  const { user } = useAuthStore();
  const [active,     setActive]     = useState([]);
  const [history,    setHistory]    = useState([]);
  const [stats,      setStats]      = useState(null);
  const [summary,    setSummary]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [polling,    setPolling]    = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [tab,        setTab]        = useState('active');
  const [viewAlert,  setViewAlert]  = useState(null);
  const [emergency,  setEmergency]  = useState(null);
  const [sirenOn,    setSirenOn]    = useState(true);
  const [lastUpdated,setLastUpdated]= useState(null);
  const siren = useSiren();
  const prevCritical = useRef(0);

  const loadActive = async () => {
    try {
      const r = await disasterApi.getActive();
      setActive(r.data || []);
      setSummary(r.summary || {});
      setLastUpdated(new Date());

      // Trigger emergency overlay + siren for NEW critical/high alerts
      const criticalNow = (r.data || []).filter(a => ['CRITICAL','HIGH'].includes(a.severity) && a.status === 'active');
      if (criticalNow.length > prevCritical.current) {
        const newest = criticalNow[0];
        setEmergency(newest);
        if (sirenOn) siren.play();
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification(`🚨 ${newest.severity} DISASTER ALERT`, {
            body: newest.title,
            icon: '/favicon.svg',
            requireInteraction: true,
          });
        }
      }
      prevCritical.current = criticalNow.length;
    } catch {}
  };

  const loadHistory = async () => {
    try { const r = await disasterApi.getHistory({ days: 7, limit: 50 }); setHistory(r.data || []); }
    catch {}
  };

  const loadStats = async () => {
    try { const r = await disasterApi.getStats(); setStats(r.data); }
    catch {}
  };

  useEffect(() => {
    // Request notification permission
    if (Notification.permission === 'default') Notification.requestPermission();
    Promise.all([loadActive(), loadHistory(), loadStats()]).finally(() => setLoading(false));
    const interval = setInterval(loadActive, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (id) => {
    try {
      await disasterApi.acknowledge(id);
      toast.success('Alert acknowledged');
      loadActive(); loadHistory();
    } catch {}
  };

  const handleResolve = async (id) => {
    try {
      await disasterApi.resolve(id, { resolution_notes: 'Resolved via dashboard' });
      toast.success('Alert resolved');
      loadActive(); loadHistory();
    } catch {}
  };

  const handlePollNow = async () => {
    setPolling(true);
    try {
      const r = await disasterApi.pollNow();
      const d = r.data;
      toast.success(`Checked sources: +${d.earthquakes} earthquakes, +${d.weather} weather alerts`);
      loadActive(); loadHistory();
    } catch { toast.error('Poll failed'); }
    finally { setPolling(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await disasterApi.createTest();
      toast('🧪 TEST alert created — for demonstration only', { icon:'🔔', duration:4000 });
      await loadActive();
      // trigger emergency overlay for the test
      const r = await disasterApi.getActive();
      const testAlert = (r.data||[]).find(a => a.is_test && a.status==='active');
      if (testAlert) {
        setEmergency(testAlert);
        if (sirenOn) siren.play();
      }
    } catch { toast.error('Test failed'); }
    finally { setTesting(false); }
  };

  const activeCritical = active.filter(a => a.severity === 'CRITICAL' && a.status === 'active').length;
  const activeHigh     = active.filter(a => a.severity === 'HIGH'     && a.status === 'active').length;

  if (loading) return <PageLoader message="Loading disaster alert system…"/>;

  return (
    <div className="space-y-5">
      {/* ── Emergency overlay ── */}
      {emergency && (
        <EmergencyOverlay
          alert={emergency}
          onDismiss={() => {
            siren.stop();
            handleAcknowledge(emergency.id);
            setEmergency(null);
          }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FiAlertTriangle className="text-red-400"/> Disaster Alert System
            {(activeCritical > 0 || activeHigh > 0) && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-600/20 text-red-400 border border-red-500/30 animate-pulse">
                {activeCritical + activeHigh} ACTIVE
              </span>
            )}
          </h1>
          <p className="page-subtitle">
            Real-time earthquake, weather and disaster monitoring for all registered mines
            {lastUpdated && <span className="ml-2 text-coal-700">· Updated {timeAgo(lastUpdated)}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Siren toggle */}
          <button onClick={() => setSirenOn(v => !v)}
            className={clsx('btn-outline btn-sm', !sirenOn && 'opacity-50')}>
            {sirenOn ? <FiVolume2 size={14}/> : <FiVolumeX size={14}/>}
            {sirenOn ? 'Siren ON' : 'Siren OFF'}
          </button>
          {/* Manual poll */}
          <button onClick={handlePollNow} disabled={polling} className="btn-outline btn-sm">
            <FiRefreshCw size={14} className={polling ? 'animate-spin' : ''}/>
            {polling ? 'Checking…' : 'Check Now'}
          </button>
          {/* Test alert */}
          {['admin','government_officer','safety_officer'].includes(user?.role) && (
            <button onClick={handleTest} disabled={testing}
              style={{
                padding:'6px 14px', borderRadius:'10px', fontSize:'12px', fontWeight:700,
                cursor: testing ? 'not-allowed' : 'pointer',
                background:'rgba(245,158,11,.15)', color:'#fbbf24',
                border:'1px solid rgba(245,158,11,.3)',
                opacity: testing ? 0.6 : 1,
              }}>
              {testing ? '⏳ Creating…' : '🧪 Test Alert'}
            </button>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Active Alerts',    value: summary.total || 0,    color:'text-coal-200', sub:'Total active' },
          { label:'Critical',         value: activeCritical,         color:'text-red-400',  sub:'Immediate action needed' },
          { label:'High Severity',    value: activeHigh,             color:'text-orange-400', sub:'Urgent attention' },
          { label:'Last Checked',     value: lastUpdated ? timeAgo(lastUpdated) : '—', color:'text-coal-400', sub:'Auto-refresh 60s' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-[10px] text-coal-600 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={clsx('text-2xl font-black tabular-nums', s.color)}>{s.value}</p>
            <p className="text-[10px] text-coal-700 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── USGS / IMD source note ── */}
      <div className="flex items-center gap-3 p-3 rounded-xl border"
        style={{ background:'rgba(96,165,250,.06)', border:'1px solid rgba(96,165,250,.2)' }}>
        <FiShield size={14} className="text-blue-400 shrink-0"/>
        <p className="text-xs text-coal-400">
          <strong className="text-blue-300">Data sources:</strong> USGS Real-Time Earthquake Feed (M4+, 24h) ·
          Open-Meteo Weather Forecast API (IMD-equivalent) ·
          Alerts auto-matched to mine GPS coordinates ·
          Refreshed every 10 minutes
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="tab-bar">
        {['active','history','stats'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={clsx('tab-item capitalize', tab===t && 'active')}>
            {t === 'active'  ? `Active (${active.length})` : t === 'history' ? 'History (7d)' : 'Statistics'}
          </button>
        ))}
      </div>

      {/* ── ACTIVE TAB ── */}
      {tab === 'active' && (
        <div className="space-y-3">
          {active.length === 0 ? (
            <div className="card text-center py-14">
              <FiCheckCircle size={36} className="text-success-400 mx-auto mb-3"/>
              <p className="font-bold text-coal-300 text-base">No active disaster alerts</p>
              <p className="text-xs text-coal-600 mt-1">All monitored mines are currently safe. Alerts auto-refresh every 60 seconds.</p>
              <button onClick={handlePollNow} disabled={polling} className="btn-outline btn-sm mt-4">
                <FiRefreshCw size={13} className={polling?'animate-spin':''}/> Check Sources Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {active.map(a => (
                <AlertCard key={a.id} alert={a}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onViewDetails={setViewAlert}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th><th>Alert</th><th>Severity</th>
                <th>Location</th><th>Time</th><th>Status</th><th>Acknowledged By</th>
              </tr>
            </thead>
            <tbody>
              {history.map(a => (
                <tr key={a.id}>
                  <td><span className="text-lg">{TYPE_ICON[a.alert_type]||'⚠️'}</span></td>
                  <td>
                    <p className="text-sm font-semibold text-coal-200 truncate max-w-xs">{a.title}</p>
                    {a.is_test ? <span className="text-[10px] text-amber-400 font-bold">🧪 TEST</span> : null}
                  </td>
                  <td><Badge color={SEV[a.severity]?.badge||'gray'}>{a.severity}</Badge></td>
                  <td><span className="text-xs text-coal-500">{a.location_name||'—'}</span></td>
                  <td><span className="text-xs text-coal-600">{formatDateTime(a.alert_time)}</span></td>
                  <td><Badge color={a.status==='resolved'?'green':a.status==='acknowledged'?'blue':'red'} dot>{a.status}</Badge></td>
                  <td><span className="text-xs text-coal-500">{a.acknowledged_by_name||'—'}</span></td>
                </tr>
              ))}
              {!history.length && (
                <tr><td colSpan={7} className="text-center text-coal-600 py-8">No alerts in the last 7 days</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── STATS TAB ── */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card">
            <h3 className="section-title">By Severity</h3>
            {(stats.by_severity||[]).map(s => (
              <div key={s.severity} className="flex justify-between py-1.5 border-b border-coal-700/40 last:border-0">
                <Badge color={SEV[s.severity]?.badge||'gray'}>{s.severity}</Badge>
                <span className="font-bold text-coal-200">{s.count}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="section-title">By Type</h3>
            {(stats.by_type||[]).map(t => (
              <div key={t.alert_type} className="flex justify-between py-1.5 border-b border-coal-700/40 last:border-0">
                <span className="text-sm text-coal-400">{TYPE_ICON[t.alert_type]||'⚠️'} {t.alert_type}</span>
                <span className="font-bold text-coal-200">{t.count}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="section-title">By Status</h3>
            {(stats.by_status||[]).map(s => (
              <div key={s.status} className="flex justify-between py-1.5 border-b border-coal-700/40 last:border-0">
                <Badge color={s.status==='resolved'?'green':s.status==='acknowledged'?'blue':'red'} dot>{s.status}</Badge>
                <span className="font-bold text-coal-200">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      <Modal isOpen={!!viewAlert} onClose={() => setViewAlert(null)}
        title={viewAlert?.title || 'Alert Details'} size="md">
        {viewAlert && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge color={SEV[viewAlert.severity]?.badge||'gray'}>{viewAlert.severity}</Badge>
              <Badge color={viewAlert.status==='resolved'?'green':viewAlert.status==='acknowledged'?'blue':'red'} dot>{viewAlert.status}</Badge>
              {viewAlert.is_test && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400">🧪 TEST</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Alert Type', viewAlert.alert_type],
                ['Source', viewAlert.source],
                ['Location', viewAlert.location_name||'—'],
                ['Alert Time', formatDateTime(viewAlert.alert_time)],
                ['Magnitude', viewAlert.magnitude ? `M${parseFloat(viewAlert.magnitude).toFixed(1)}` : '—'],
                ['Wind Speed', viewAlert.wind_speed ? `${parseFloat(viewAlert.wind_speed).toFixed(0)} km/h` : '—'],
                ['Rainfall', viewAlert.rainfall ? `${parseFloat(viewAlert.rainfall).toFixed(0)} mm` : '—'],
                ['Coordinates', viewAlert.latitude ? `${parseFloat(viewAlert.latitude).toFixed(4)}°N, ${parseFloat(viewAlert.longitude).toFixed(4)}°E` : '—'],
              ].map(([k,v]) => (
                <div key={k}>
                  <p className="text-[10px] text-coal-600 uppercase tracking-widest mb-0.5">{k}</p>
                  <p className="font-semibold text-coal-200 text-sm">{v}</p>
                </div>
              ))}
            </div>
            {viewAlert.description && (
              <div className="p-3 rounded-xl bg-coal-800/60 border border-coal-700/40">
                <p className="text-xs text-coal-600 mb-1">Description</p>
                <p className="text-sm text-coal-300 leading-relaxed">{viewAlert.description}</p>
              </div>
            )}
            {viewAlert.affected_mines?.length > 0 && (
              <div>
                <p className="text-[10px] text-coal-600 uppercase tracking-widest mb-2">Affected Mines</p>
                <div className="flex flex-wrap gap-2">
                  {viewAlert.affected_mines.map((m,i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background:'rgba(239,68,68,.12)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }}>
                      {m.name}{m.distance ? ` — ${m.distance}km` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[10px] text-coal-600 uppercase tracking-widest mb-2">Emergency Actions</p>
              <div className="space-y-1.5">
                {getEvacInstructions(viewAlert.alert_type).map((e,i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/8 border border-amber-500/15">
                    <span className="text-amber-400 font-black shrink-0 text-xs mt-0.5">{i+1}.</span>
                    <span className="text-xs text-coal-300">{e}</span>
                  </div>
                ))}
              </div>
            </div>
            {viewAlert.status === 'active' && (
              <div className="flex gap-3 pt-2 border-t border-coal-700/50">
                <button onClick={() => { handleAcknowledge(viewAlert.id); setViewAlert(null); }}
                  className="btn-primary btn-sm flex-1 justify-center">
                  <FiCheckCircle size={13}/> Acknowledge
                </button>
                <button onClick={() => { handleResolve(viewAlert.id); setViewAlert(null); }}
                  className="btn-success btn-sm flex-1 justify-center">
                  <FiXCircle size={13}/> Resolve
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

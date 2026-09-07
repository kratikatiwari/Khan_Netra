import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiSend, FiPlus, FiTrash2, FiMessageSquare, FiCpu,
  FiUser, FiChevronLeft, FiChevronRight, FiClock,
  FiCopy, FiCheck, FiAlertCircle, FiRefreshCw, FiGlobe,
  FiMic, FiMicOff, FiVolume2, FiVolumeX,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { aiApi } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';
import clsx from 'clsx';

/* ── helpers ──────────────────────────────────────────────────────────── */
const newId = () => crypto.randomUUID();

/* ── Voice Commands map ───────────────────────────────────────────────── */
const VOICE_COMMANDS = {
  'show high-risk violations':  'Show me all high-risk and critical violations',
  'open incidents':             'Show all open safety incidents',
  'generate compliance report': 'Generate a compliance status summary report',
  'show today alerts':          "What are today's critical alerts and deadlines?",
  'methane limit':              'What is the permissible methane limit in underground coal mines?',
  'inspection schedule':        'What is the inspection schedule requirement under CMR 2017?',
  'fatal accident report':      'How should a fatal accident be reported to DGMS?',
};

const LANGS = [
  { code:'en', label:'English', flag:'🇬🇧' },
  { code:'hi', label:'हिंदी',   flag:'🇮🇳' },
  { code:'bn', label:'বাংলা',   flag:'🇧🇩' },
  { code:'mr', label:'मराठी',   flag:'🇮🇳' },
  { code:'te', label:'తెలుగు',  flag:'🇮🇳' },
  { code:'ta', label:'தமிழ்',   flag:'🇮🇳' },
];

const STARTERS = [
  { en:'What is the permissible methane limit in underground mines?',  hi:'भूमिगत खदान में मीथेन की अनुमेय सीमा क्या है?' },
  { en:'Explain ventilation requirements under CMR 2017',              hi:'CMR 2017 के तहत वेंटिलेशन आवश्यकताएं बताएं' },
  { en:'How to report a fatal accident to DGMS?',                      hi:'DGMS को घातक दुर्घटना की रिपोर्ट कैसे करें?' },
  { en:'What are NAAQS air quality standards for coal mines?',         hi:'कोयला खदानों के लिए NAAQS वायु गुणवत्ता मानक क्या हैं?' },
  { en:'What PPE is mandatory for underground workers?',               hi:'भूमिगत कर्मचारियों के लिए कौन सा PPE अनिवार्य है?' },
  { en:'Explain compliance scoring methodology for mines',             hi:'खदानों के लिए अनुपालन स्कोरिंग पद्धति समझाएं' },
];

/* ── typing animation ─────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0,1,2].map(i => (
        <span key={i}
          className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
          style={{ animationDelay:`${i*0.18}s`, animationDuration:'0.9s' }}
        />
      ))}
    </div>
  );
}

/* ── copy button ──────────────────────────────────────────────────────── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-coal-200 text-coal-400 transition-colors" title="Copy">
      {copied ? <FiCheck size={13} className="text-green-500"/> : <FiCopy size={13}/>}
    </button>
  );
}

/* ── message bubble ───────────────────────────────────────────────────── */
function MessageBubble({ msg }) {
  const isUser  = msg.role === 'user';
  const isError = msg.error;
  return (
    <div className={clsx('group flex gap-3 px-2', isUser ? 'flex-row-reverse' : '')}>
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm',
        isUser ? 'bg-primary-600' : isError ? 'bg-red-500' : 'bg-gradient-to-br from-coal-700 to-coal-900'
      )}>
        {isUser
          ? <FiUser size={14} className="text-white"/>
          : isError ? <FiAlertCircle size={14} className="text-white"/>
          : <FiCpu size={14} className="text-white"/>}
      </div>
      <div className={clsx('max-w-[78%] flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'rounded-2xl px-4 py-3 shadow-sm',
          isUser   ? 'bg-primary-600 text-white rounded-tr-sm'
          : isError ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-sm'
          :           'bg-white border border-coal-100 text-coal-900 rounded-tl-sm'
        )}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="text-sm leading-relaxed prose prose-sm max-w-none
              prose-headings:text-coal-800 prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1
              prose-p:my-1 prose-ul:my-1 prose-li:my-0.5
              prose-strong:text-coal-900 prose-code:bg-coal-100 prose-code:px-1 prose-code:rounded">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-coal-400">
            {msg.ts ? new Date(msg.ts).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : ''}
          </span>
          {!isUser && msg.model && <span className="text-[10px] text-coal-300 font-mono">{msg.model}</span>}
          {!isUser && !isError && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyBtn text={msg.content}/>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── sidebar session item ─────────────────────────────────────────────── */
function SessionItem({ session, active, onSelect, onDelete }) {
  const preview = session.first_message || 'New conversation';
  return (
    <div
      onClick={() => onSelect(session.session_id)}
      className={clsx(
        'group flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all',
        active ? 'bg-primary-600/20 border border-primary-500/30' : 'hover:bg-coal-700'
      )}
    >
      <FiMessageSquare size={14} className={clsx('shrink-0 mt-0.5', active ? 'text-primary-400' : 'text-coal-400')}/>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-xs font-medium truncate', active ? 'text-primary-200' : 'text-coal-300')}>
          {preview.length > 45 ? preview.substring(0, 45) + '…' : preview}
        </p>
        <p className="text-[10px] text-coal-500 mt-0.5">
          {session.messages} msgs · {timeAgo(session.last_message)}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(session.session_id); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-coal-500 hover:text-red-400 transition-all"
      >
        <FiTrash2 size={12}/>
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════════ */
export default function AIChat() {
  const { user } = useAuthStore();

  /* ── state ─────────────────────────────────────────────────────────── */
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [sessionId,      setSessionId]      = useState(() => newId());
  const [sessions,       setSessions]       = useState([]);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [langHint,       setLangHint]       = useState('en');
  const [aiStatus,       setAiStatus]       = useState(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceOutput,    setVoiceOutput]    = useState(true);

  /* ── refs ──────────────────────────────────────────────────────────── */
  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef       = useRef(window.speechSynthesis);

  /* ── scroll to bottom ─────────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ── load sessions + AI status on mount ───────────────────────────── */
  useEffect(() => {
    loadSessions();
    fetch('/api/v1/ai/status', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(r => { if (r.success) setAiStatus(r.data); })
      .catch(() => {});
  }, []);

  /* ── focus input on session change ───────────────────────────────── */
  useEffect(() => { inputRef.current?.focus(); }, [sessionId]);

  /* ── cleanup speech synthesis on unmount ─────────────────────────── */
  useEffect(() => () => synthRef.current?.cancel(), []);

  /* ── helpers ──────────────────────────────────────────────────────── */
  const loadSessions = async () => {
    try { const r = await aiApi.getSessions(); setSessions(r.data || []); }
    catch {}
  };

  const loadHistory = async (sid) => {
    try {
      const r = await aiApi.getChatHistory(sid);
      setMessages(
        (r.data || []).map(m => ({
          id:      m.id || newId(),
          role:    m.role,
          content: m.content,
          model:   null,
          ts:      m.created_at,
        }))
      );
    } catch {}
  };

  const newChat = () => {
    setSessionId(newId());
    setMessages([]);
    inputRef.current?.focus();
  };

  const selectSession = async (sid) => {
    setSessionId(sid);
    setMessages([]);
    await loadHistory(sid);
  };

  const deleteSession = async (sid) => {
    try {
      await aiApi.deleteSession(sid);
      toast.success('Chat deleted');
      setSessions(prev => prev.filter(s => s.session_id !== sid));
      if (sid === sessionId) newChat();
    } catch {}
  };

  const clearChat = async () => {
    try {
      await aiApi.clearSession(sessionId);
      setMessages([]);
      toast.success('Chat cleared');
      loadSessions();
    } catch {}
  };

  /* ── speak (voice output) ─────────────────────────────────────────── */
  // Declared BEFORE send so send can reference it safely.
  const speak = useCallback((text) => {
    if (!voiceOutput || !synthRef.current) return;
    synthRef.current.cancel();
    const plain = text
      .replace(/[*_#`[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .substring(0, 400);
    const utt = new SpeechSynthesisUtterance(plain);
    utt.lang  = langHint === 'hi' ? 'hi-IN'
              : langHint === 'bn' ? 'bn-IN'
              : langHint === 'mr' ? 'mr-IN'
              : langHint === 'te' ? 'te-IN'
              : langHint === 'ta' ? 'ta-IN'
              : 'en-IN';
    utt.rate  = 0.95;
    utt.pitch = 1;
    synthRef.current.speak(utt);
  }, [voiceOutput, langHint]);

  /* ── send message ─────────────────────────────────────────────────── */
  // Declared AFTER speak so speak is already initialised.
  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    setMessages(prev => [
      ...prev,
      { id: newId(), role: 'user', content: msg, ts: new Date().toISOString() },
    ]);
    setLoading(true);

    try {
      const res = await aiApi.chat({ message: msg, session_id: sessionId });
      const d   = res.data;
      setMessages(prev => [
        ...prev,
        {
          id:      newId(),
          role:    'assistant',
          content: d.message,
          model:   d.model && d.model !== 'none' ? d.model : null,
          tokens:  d.tokens,
          ts:      d.timestamp,
        },
      ]);
      loadSessions();
      speak(d.message);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id:      newId(),
          role:    'assistant',
          content: err.response?.data?.message || 'Something went wrong. Please try again.',
          error:   true,
          ts:      new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId, speak]);

  /* ── startVoice ───────────────────────────────────────────────────── */
  // Declared AFTER send so send is already initialised.
  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice input not supported in this browser'); return; }
    const r = new SR();
    r.continuous     = false;
    r.interimResults = false;
    r.lang =
      langHint === 'hi' ? 'hi-IN' :
      langHint === 'bn' ? 'bn-IN' :
      langHint === 'mr' ? 'mr-IN' :
      langHint === 'te' ? 'te-IN' :
      langHint === 'ta' ? 'ta-IN' : 'en-IN';
    r.onstart  = () => { setVoiceListening(true); toast('🎙️ Listening…', { icon:'🎤', duration:3000 }); };
    r.onend    = () => setVoiceListening(false);
    r.onerror  = e  => { setVoiceListening(false); if (e.error !== 'no-speech') toast.error(`Voice error: ${e.error}`); };
    r.onresult = e  => {
      const transcript = e.results[0][0].transcript.trim();
      if (!transcript) return;
      const lower   = transcript.toLowerCase();
      const matched = Object.entries(VOICE_COMMANDS).find(([cmd]) => lower.includes(cmd));
      const finalText = matched ? matched[1] : transcript;
      setInput(finalText);
      if (matched) setTimeout(() => send(finalText), 300);
    };
    recognitionRef.current = r;
    r.start();
  }, [langHint, send]);          // send is now always initialised before startVoice

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setVoiceListening(false);
  };

  /* ── keyboard handler ─────────────────────────────────────────────── */
  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isCurrentSession = sid => sid === sessionId;
  const hasMessages      = messages.length > 0;

  /* ════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 rounded-2xl overflow-hidden border border-coal-200 shadow-lg bg-white">

      {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className={clsx(
        'flex flex-col bg-coal-900 transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-coal-700 shrink-0">
          <div className="flex items-center gap-2">
            <FiCpu size={16} className="text-primary-400"/>
            <span className="text-sm font-bold text-white">Chat History</span>
          </div>
          <button onClick={loadSessions} className="p-1 rounded hover:bg-coal-700 text-coal-400" title="Refresh">
            <FiRefreshCw size={13}/>
          </button>
        </div>

        {/* New chat */}
        <div className="p-3 shrink-0">
          <button onClick={newChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <FiPlus size={16}/> New Chat
          </button>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-coal-500 text-center py-6">No previous chats</p>
          ) : sessions.map(s => (
            <SessionItem
              key={s.session_id}
              session={s}
              active={isCurrentSession(s.session_id)}
              onSelect={selectSession}
              onDelete={deleteSession}
            />
          ))}
        </div>

        {/* Language selector */}
        <div className="p-3 border-t border-coal-700 shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            <FiGlobe size={11} className="text-coal-500"/>
            <span className="text-[10px] text-coal-500 uppercase tracking-wide font-semibold">Reply Language</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {LANGS.map(l => (
              <button key={l.code} onClick={() => setLangHint(l.code)}
                className={clsx('px-2 py-1 rounded text-[10px] font-medium transition-colors',
                  langHint === l.code
                    ? 'bg-primary-600 text-white'
                    : 'bg-coal-700 text-coal-400 hover:bg-coal-600')}>
                {l.flag} {l.code.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-coal-600 mt-1.5">AI auto-detects your language</p>
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 bg-coal-50">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-coal-200 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)}
              className="p-1.5 rounded-lg hover:bg-coal-100 text-coal-500 transition-colors">
              {sidebarOpen ? <FiChevronLeft size={18}/> : <FiChevronRight size={18}/>}
            </button>
            <div>
              <h2 className="font-bold text-coal-900 text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                KhanNetra AI
              </h2>
              <p className="text-[10px] text-coal-400">
                Gemini · Multilingual · Coal Mine Expert
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && (
              <button onClick={clearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-coal-600 hover:bg-red-50 hover:text-red-600 border border-coal-200 transition-colors">
                <FiTrash2 size={13}/> Clear
              </button>
            )}
            <button onClick={newChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors">
              <FiPlus size={13}/> New Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-5">
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 -mt-4">

              {/* API Key banner — shown only when status is loaded and key is missing */}
              {aiStatus && !aiStatus.ready && (
                <div className="w-full max-w-2xl mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">🔑</span>
                    <div>
                      <p className="font-bold text-amber-400 mb-1">Gemini API Key Required</p>
                      <p className="text-sm text-coal-400 mb-3">
                        Add a free key to <code className="bg-coal-800 px-1.5 py-0.5 rounded text-amber-300">server/.env</code>:
                      </p>
                      <div className="bg-coal-900 rounded-lg p-3 font-mono text-xs text-green-400 mb-3 select-all">
                        GEMINI_API_KEY=AIzaSyYourKeyHere
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <a href="https://aistudio.google.com/app/apikey"
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-coal-950 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors">
                          🚀 Get Free Gemini Key
                        </a>
                        <span className="text-xs text-coal-500">Then restart the server</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Connected banner */}
              {aiStatus?.ready && (
                <div className="w-full max-w-2xl mb-4 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"/>
                  <span className="text-xs text-green-400 font-medium">
                    AI Connected · {aiStatus.backend === 'gemini' ? 'Google Gemini' : 'OpenAI GPT-4o'}
                  </span>
                </div>
              )}

              {/* Logo + title */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-coal-800 flex items-center justify-center mb-4 shadow-lg">
                <FiCpu size={32} className="text-white"/>
              </div>
              <h2 className="text-2xl font-black text-coal-900 mb-1">KhanNetra AI</h2>
              <p className="text-coal-500 text-sm mb-1">Smart governance assistant for India's coal mines</p>
              <p className="text-coal-400 text-xs mb-6">
                Powered by Gemini · Supports English, Hindi, Bengali, Marathi, Telugu, Tamil
              </p>

              {/* Starter questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {STARTERS.map((s, i) => (
                  <button key={i} onClick={() => send(langHint === 'hi' ? s.hi : s.en)}
                    className="text-left p-3 rounded-xl border border-coal-200 bg-white hover:border-primary-400 hover:bg-primary-50 transition-all text-xs text-coal-700 font-medium group shadow-sm">
                    <span className="text-primary-500 mr-1.5 group-hover:mr-2 transition-all">→</span>
                    {langHint === 'hi' ? s.hi : s.en}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-6 text-[10px] text-coal-400">
                {LANGS.map(l => <span key={l.code}>{l.flag} {l.label}</span>)}
              </div>
            </div>
          )}

          {messages.map(msg => <MessageBubble key={msg.id} msg={msg}/>)}

          {loading && (
            <div className="flex gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-coal-700 to-coal-900 flex items-center justify-center shrink-0 mt-1">
                <FiCpu size={14} className="text-white"/>
              </div>
              <div className="bg-white border border-coal-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <TypingDots/>
              </div>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 bg-white border-t border-coal-200 shrink-0">
          <div className="flex items-end gap-3 bg-coal-50 border border-coal-200 rounded-2xl px-4 py-3 focus-within:border-primary-400 focus-within:shadow-sm transition-all">

            {/* Mic button */}
            <button type="button"
              onClick={voiceListening ? stopVoice : startVoice}
              title={voiceListening ? 'Stop listening' : 'Voice input — try "methane limit"'}
              className={clsx('p-1.5 rounded-lg shrink-0 transition-all mb-0.5',
                voiceListening
                  ? 'bg-red-100 text-red-500 animate-pulse'
                  : 'text-coal-400 hover:text-coal-600 hover:bg-coal-200')}>
              {voiceListening ? <FiMicOff size={16}/> : <FiMic size={16}/>}
            </button>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              className="flex-1 bg-transparent text-sm text-coal-900 placeholder-coal-400 resize-none outline-none max-h-32 leading-relaxed"
              placeholder={
                voiceListening
                  ? '🎙️ Listening… speak your question'
                  : 'Ask about CMR 2017, safety regulations, compliance… (Enter to send)'
              }
              disabled={loading}
              style={{ height:'auto', minHeight:'24px' }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />

            {/* Voice output toggle */}
            <button type="button"
              onClick={() => { setVoiceOutput(v => !v); synthRef.current?.cancel(); }}
              title={voiceOutput ? 'Mute AI responses' : 'Enable AI voice responses'}
              className={clsx('p-1.5 rounded-lg shrink-0 transition-all mb-0.5',
                voiceOutput ? 'text-primary-500' : 'text-coal-400 hover:text-coal-600')}>
              {voiceOutput ? <FiVolume2 size={16}/> : <FiVolumeX size={16}/>}
            </button>

            {/* Send button */}
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <FiSend size={16}/>}
            </button>
          </div>
          <p className="text-[10px] text-coal-400 text-center mt-2">
            KhanNetra AI · <span className="text-coal-500">🎙️ Voice commands supported</span> · Always confirm with official DGMS sources
          </p>
        </div>

      </div>
    </div>
  );
}

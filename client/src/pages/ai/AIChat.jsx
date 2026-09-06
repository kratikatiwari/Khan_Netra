import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiSend, FiPlus, FiTrash2, FiMessageSquare, FiCpu,
  FiUser, FiChevronLeft, FiChevronRight, FiClock,
  FiCopy, FiCheck, FiAlertCircle, FiRefreshCw, FiGlobe
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { aiApi } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { timeAgo } from '../../utils/helpers';
import toast from 'react-hot-toast';
import clsx from 'clsx';

/* ── helpers ──────────────────────────────────────────────────────────── */
const newId = () => crypto.randomUUID();

const LANGS = [
  { code:'en', label:'English',   flag:'🇬🇧' },
  { code:'hi', label:'हिंदी',      flag:'🇮🇳' },
  { code:'bn', label:'বাংলা',      flag:'🇧🇩' },
  { code:'mr', label:'मराठी',      flag:'🇮🇳' },
  { code:'te', label:'తెలుగు',     flag:'🇮🇳' },
  { code:'ta', label:'தமிழ்',      flag:'🇮🇳' },
];

const STARTERS = [
  { en:"What is the permissible methane limit in underground mines?",   hi:"भूमिगत खदान में मीथेन की अनुमेय सीमा क्या है?" },
  { en:"Explain ventilation requirements under CMR 2017",               hi:"CMR 2017 के तहत वेंटिलेशन आवश्यकताएं बताएं" },
  { en:"How to report a fatal accident to DGMS?",                       hi:"DGMS को घातक दुर्घटना की रिपोर्ट कैसे करें?" },
  { en:"What are NAAQS air quality standards for coal mines?",          hi:"कोयला खदानों के लिए NAAQS वायु गुणवत्ता मानक क्या हैं?" },
  { en:"What PPE is mandatory for underground workers?",                hi:"भूमिगत कर्मचारियों के लिए कौन सा PPE अनिवार्य है?" },
  { en:"Explain compliance scoring methodology for mines",              hi:"खदानों के लिए अनुपालन स्कोरिंग पद्धति समझाएं" },
];

/* ── typing animation dot ─────────────────────────────────────────────── */
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

/* ── single message bubble ─────────────────────────────────────────────── */
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isError= msg.error;

  return (
    <div className={clsx('group flex gap-3 px-2', isUser ? 'flex-row-reverse' : '')}>
      {/* Avatar */}
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm',
        isUser ? 'bg-primary-600' : isError ? 'bg-red-500' : 'bg-gradient-to-br from-coal-700 to-coal-900'
      )}>
        {isUser
          ? <FiUser size={14} className="text-white"/>
          : isError ? <FiAlertCircle size={14} className="text-white"/>
          : <FiCpu size={14} className="text-white"/>}
      </div>

      {/* Bubble */}
      <div className={clsx('max-w-[78%] flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className={clsx(
          'rounded-2xl px-4 py-3 shadow-sm',
          isUser  ? 'bg-primary-600 text-white rounded-tr-sm'
          : isError? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-sm'
          : 'bg-white border border-coal-100 text-coal-900 rounded-tl-sm'
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

        {/* Meta row */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-coal-400">
            {msg.ts ? new Date(msg.ts).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'}) : ''}
          </span>
          {!isUser && msg.model && (
            <span className="text-[10px] text-coal-300 font-mono">{msg.model}</span>
          )}
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
        onClick={(e) => { e.stopPropagation(); onDelete(session.session_id); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-coal-500 hover:text-red-400 transition-all"
      >
        <FiTrash2 size={12}/>
      </button>
    </div>
  );
}

/* ── MAIN COMPONENT ───────────────────────────────────────────────────── */
export default function AIChat() {
  const { user } = useAuthStore();

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [sessionId,  setSessionId]  = useState(() => newId());
  const [sessions,   setSessions]   = useState([]);
  const [sidebarOpen,setSidebarOpen]= useState(true);
  const [langHint,   setLangHint]   = useState('en');

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const abortRef    = useRef(null);

  /* scroll to bottom on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* load sessions on mount */
  useEffect(() => { loadSessions(); }, []);

  /* focus input on session change */
  useEffect(() => { inputRef.current?.focus(); }, [sessionId]);

  const loadSessions = async () => {
    try { const r = await aiApi.getSessions(); setSessions(r.data || []); }
    catch {}
  };

  /* load history for a session */
  const loadHistory = async (sid) => {
    try {
      const r = await aiApi.getChatHistory(sid);
      const msgs = (r.data || []).map(m => ({
        id:      m.id || newId(),
        role:    m.role,
        content: m.content,
        model:   null,
        ts:      m.created_at,
      }));
      setMessages(msgs);
    } catch {}
  };

  /* start a new chat */
  const newChat = () => {
    setSessionId(newId());
    setMessages([]);
    inputRef.current?.focus();
  };

  /* switch to a previous session */
  const selectSession = async (sid) => {
    setSessionId(sid);
    setMessages([]);
    await loadHistory(sid);
  };

  /* delete a session */
  const deleteSession = async (sid) => {
    try {
      await aiApi.deleteSession(sid);
      toast.success('Chat deleted');
      setSessions(prev => prev.filter(s => s.session_id !== sid));
      if (sid === sessionId) newChat();
    } catch {}
  };

  /* clear current chat messages (keep session) */
  const clearChat = async () => {
    try {
      await aiApi.clearSession(sessionId);
      setMessages([]);
      toast.success('Chat cleared');
      loadSessions();
    } catch {}
  };

  /* send a message */
  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { id: newId(), role: 'user', content: msg, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await aiApi.chat({ message: msg, session_id: sessionId });
      const d   = res.data;
      const assistantMsg = {
        id:      newId(),
        role:    'assistant',
        content: d.message,
        model:   d.model && d.model !== 'none' ? d.model : null,
        tokens:  d.tokens,
        ts:      d.timestamp,
      };
      setMessages(prev => [...prev, assistantMsg]);
      loadSessions(); // refresh session list
    } catch (err) {
      setMessages(prev => [...prev, {
        id:      newId(),
        role:    'assistant',
        content: err.response?.data?.message || 'Something went wrong. Please try again.',
        error:   true,
        ts:      new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const isCurrentSession = (sid) => sid === sessionId;
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-80px)] gap-0 rounded-2xl overflow-hidden border border-coal-200 shadow-lg bg-white">

      {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className={clsx(
        'flex flex-col bg-coal-900 transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-coal-700 shrink-0">
          <div className="flex items-center gap-2">
            <FiCpu size={16} className="text-primary-400"/>
            <span className="text-sm font-bold text-white">Chat History</span>
          </div>
          <button onClick={loadSessions} className="p-1 rounded hover:bg-coal-700 text-coal-400" title="Refresh">
            <FiRefreshCw size={13}/>
          </button>
        </div>

        {/* New chat button */}
        <div className="p-3 shrink-0">
          <button onClick={newChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <FiPlus size={16}/> New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-coal-500 text-center py-6">No previous chats</p>
          ) : (
            sessions.map(s => (
              <SessionItem
                key={s.session_id}
                session={s}
                active={isCurrentSession(s.session_id)}
                onSelect={selectSession}
                onDelete={deleteSession}
              />
            ))
          )}
        </div>

        {/* Language hint */}
        <div className="p-3 border-t border-coal-700 shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            <FiGlobe size={11} className="text-coal-500"/>
            <span className="text-[10px] text-coal-500 uppercase tracking-wide font-semibold">Reply Language</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {LANGS.map(l => (
              <button key={l.code} onClick={() => setLangHint(l.code)}
                className={clsx('px-2 py-1 rounded text-[10px] font-medium transition-colors',
                  langHint === l.code ? 'bg-primary-600 text-white' : 'bg-coal-700 text-coal-400 hover:bg-coal-600')}>
                {l.flag} {l.code.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-coal-600 mt-1.5">AI auto-detects your language</p>
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ──────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 bg-coal-50">

        {/* Chat toolbar */}
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
                GPT-4o · Multilingual · Coal Mine Expert
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

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-5">
          {!hasMessages && (
            /* Welcome screen */
            <div className="flex flex-col items-center justify-center h-full text-center px-4 -mt-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-coal-800 flex items-center justify-center mb-4 shadow-lg">
                <FiCpu size={32} className="text-white"/>
              </div>
              <h2 className="text-2xl font-black text-coal-900 mb-1">KhanNetra AI</h2>
              <p className="text-coal-500 text-sm mb-1">Smart governance assistant for India's coal mines</p>
              <p className="text-coal-400 text-xs mb-6">
                Powered by GPT-4o · Supports English, Hindi, Bengali, Marathi, Telugu, Tamil
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
                {LANGS.map(l => (
                  <span key={l.code}>{l.flag} {l.label}</span>
                ))}
              </div>
            </div>
          )}

          {/* Render messages */}
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg}/>)}

          {/* Typing indicator */}
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

        {/* Input area */}
        <div className="px-4 pb-4 pt-2 bg-white border-t border-coal-200 shrink-0">
          <div className="flex items-end gap-3 bg-coal-50 border border-coal-200 rounded-2xl px-4 py-3 focus-within:border-primary-400 focus-within:shadow-sm transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              className="flex-1 bg-transparent text-sm text-coal-900 placeholder-coal-400 resize-none outline-none max-h-32 leading-relaxed"
              placeholder="Ask about CMR 2017, safety regulations, compliance... (Enter to send, Shift+Enter for new line)"
              disabled={loading}
              style={{ height: 'auto', minHeight: '24px' }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                : <FiSend size={16}/>
              }
            </button>
          </div>
          <p className="text-[10px] text-coal-400 text-center mt-2">
            KhanNetra AI · Verified against CMR 2017, Mines Act 1952 · Always confirm with official DGMS sources
          </p>
        </div>
      </div>
    </div>
  );
}

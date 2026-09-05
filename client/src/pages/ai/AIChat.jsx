import { useState, useRef, useEffect } from 'react';
import { FiSend, FiMessageSquare, FiUser, FiCpu, FiPlus } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { aiApi } from '../../services/api';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// Use browser built-in - no uuid package needed
const newId = () => crypto.randomUUID();

const SUGGESTIONS = [
  'What are the methane safety limits in underground coal mines?',
  'Explain ventilation requirements under CMR 2017',
  'What are the NAAQS air quality standards for coal mines?',
  'How should a fatal accident be reported to DGMS?',
  'What is the penalty for environmental violations?',
  'What documents are required for mining lease renewal?',
  'Explain the inspection schedule for coal mines',
];

const WELCOME = `**Namaste! 🙏 Welcome to KhanNetra AI Assistant**\n\nI'm your intelligent compliance advisor for coal mine governance. I can help with:\n\n• **CMR 2017** – Coal Mines Regulations\n• **Mines Act 1952** – Safety & legal requirements\n• **Environmental Standards** – NAAQS, CPCB guidelines\n• **DGMS Procedures** – Inspection, accident reporting\n• **License & Permits** – MMDR Act, EC requirements\n\nAsk me anything!`;

export default function AIChat() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: WELCOME, ts: new Date() }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sessionId]             = useState(() => newId());
  const bottomRef               = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, ts: new Date() }]);
    setLoading(true);
    try {
      const res = await aiApi.chat({ message: msg, session_id: sessionId });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.message, ts: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred. Please try again.', ts: new Date() }]);
    } finally { setLoading(false); }
  };

  const reset = () => {
    setMessages([{ role: 'assistant', content: 'New conversation started. How can I help?', ts: new Date() }]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title flex items-center gap-2"><FiMessageSquare className="text-primary-600" /> AI Regulatory Advisor</h1>
          <p className="page-subtitle">Ask about regulations, compliance and safety standards</p>
        </div>
        <button onClick={reset} className="btn-outline btn-sm"><FiPlus size={14} /> New Chat</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-coal-200 p-4 space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={clsx('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}>
            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1',
              msg.role === 'user' ? 'bg-primary-600' : 'bg-coal-800')}>
              {msg.role === 'user' ? <FiUser size={14} className="text-white" /> : <FiCpu size={14} className="text-white" />}
            </div>
            <div className={clsx('max-w-[80%] rounded-2xl px-4 py-3',
              msg.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-coal-50 text-coal-900 rounded-tl-sm')}>
              {msg.role === 'assistant' ? (
                <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
              <p className={clsx('text-[10px] mt-1', msg.role === 'user' ? 'text-primary-200' : 'text-coal-400')}>
                {msg.ts?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-coal-800 flex items-center justify-center shrink-0">
              <FiCpu size={14} className="text-white" />
            </div>
            <div className="bg-coal-50 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 bg-coal-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i*0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.slice(0, 4).map(s => (
            <button key={s} onClick={() => send(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors truncate max-w-xs">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          className="input flex-1 py-3"
          placeholder="Ask about CMR 2017, safety regulations, compliance…"
          disabled={loading}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading} className="btn-primary px-4">
          <FiSend size={18} />
        </button>
      </div>
      <p className="text-[10px] text-coal-400 text-center mt-2">
        Responses are based on Indian coal mining regulations. Always verify with official DGMS guidelines.
      </p>
    </div>
  );
}

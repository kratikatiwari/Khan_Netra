/**
 * KhanNetra AI Controller
 * Real LLM integration: OpenAI GPT-4o / Gemini 1.5 Flash
 * Features: multilingual, context memory, conversation history
 */
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are KhanNetra AI — an intelligent governance and compliance assistant for India's coal mining sector, built for the Directorate General of Mines Safety (DGMS), Ministry of Coal, Government of India.

Your expertise covers:
• Coal Mines Regulations 2017 (CMR 2017) — all 300+ regulations
• Mines Act 1952 and Mines Rules 1955
• MMDR Act 1957 (Mines and Minerals Development and Regulation)
• Environment Protection Act 1986, NAAQS standards, CPCB guidelines
• DGMS inspection procedures, accident investigation, statutory duties
• Mine safety: ventilation, methane, strata control, electrical safety, fire
• Environmental monitoring: air quality, water quality, noise levels
• License, lease and permit requirements and renewal processes
• Labor welfare, working hours, wages under Mines Workers Act
• Digital compliance scoring, risk assessment methodology
• Best practices in smart governance for coal sector

Behavior rules:
1. Detect the user's language automatically and ALWAYS reply in the SAME language they wrote in.
2. Supported languages: English, Hindi (हिंदी), Bengali (বাংলা), Marathi (मराठी), Telugu (తెలుగు), Tamil (தமிழ்).
3. Give accurate, regulation-specific answers — cite section/regulation numbers when relevant.
4. For follow-up questions, use full conversation context to give coherent answers.
5. Be concise but thorough. Use bullet points and headers for clarity.
6. If asked something outside coal mine governance, politely redirect to your domain.
7. Never make up regulations or penalty amounts — if unsure, say so clearly.
8. Treat all users as professionals (mine managers, inspectors, govt officers).`;

// ── LLM caller ──────────────────────────────────────────────────────────────
async function callLLM(messages) {
  // Try OpenAI first
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    return await callOpenAI(messages);
  }
  // Try Gemini
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    return await callGemini(messages);
  }
  throw new Error('NO_API_KEY');
}

async function callOpenAI(messages) {
  const https = require('https');
  const body  = JSON.stringify({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 1024,
    temperature: 0.7,
    stream: false,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };
    let data = '';
    const req = https.request(options, (res) => {
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          resolve({
            text: json.choices[0].message.content,
            tokens: json.usage?.total_tokens || 0,
            model: json.model,
          });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function callGemini(messages) {
  const https = require('https');
  // Convert OpenAI-style messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
  });

  const path = `/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    let data = '';
    const req = https.request(options, (res) => {
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
          resolve({ text, tokens: 0, model: 'gemini-3.6-flash' });
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Fallback (no API key) ────────────────────────────────────────────────────
function fallbackResponse(message) {
  return `⚠️ **AI API key not configured.**\n\nTo enable the real KhanNetra AI assistant:\n\n1. Get an API key from [OpenAI](https://platform.openai.com) or [Google AI Studio](https://aistudio.google.com)\n2. Open \`server/.env\`\n3. Set \`OPENAI_API_KEY=sk-...\` or \`GEMINI_API_KEY=...\`\n4. Restart the server\n\nYour question was: *"${message}"*\n\nOnce configured, KhanNetra AI will answer this and all future questions dynamically in your language.`;
}

// ── Exports ──────────────────────────────────────────────────────────────────
exports.chat = async (req, res, next) => {
  try {
    const { message, session_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required' });

    const sid = session_id || uuidv4();

    // Save user message
    await query(
      `INSERT INTO chat_history (id,user_id,session_id,role,content) VALUES (?,?,?,'user',?)`,
      [uuidv4(), req.user.id, sid, message.trim()]
    );

    // Load full conversation context (last 20 turns)
    const history = (await query(
      `SELECT role, content FROM chat_history
       WHERE user_id=? AND session_id=? ORDER BY created_at ASC LIMIT 20`,
      [req.user.id, sid]
    )).rows;

    // Build messages array for LLM
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(h => ({ role: h.role, content: h.content })),
    ];

    let responseText = '';
    let tokensUsed = 0;
    let modelUsed = 'none';

    try {
      const result = await callLLM(messages);
      responseText = result.text;
      tokensUsed   = result.tokens;
      modelUsed    = result.model;
    } catch (err) {
      if (err.message === 'NO_API_KEY') {
        responseText = fallbackResponse(message);
      } else {
        console.error('LLM error:', err.message);
        responseText = `I encountered an error connecting to the AI service. Please check your API key configuration.\n\nError: ${err.message}`;
      }
    }

    // Save assistant response
    await query(
      `INSERT INTO chat_history (id,user_id,session_id,role,content,tokens_used) VALUES (?,?,?,'assistant',?,?)`,
      [uuidv4(), req.user.id, sid, responseText, tokensUsed]
    );

    res.json({
      success: true,
      data: {
        message:    responseText,
        session_id: sid,
        model:      modelUsed,
        tokens:     tokensUsed,
        timestamp:  new Date().toISOString(),
      }
    });
  } catch (err) { next(err); }
};

exports.getChatHistory = async (req, res, next) => {
  try {
    const rows = (await query(
      `SELECT id, role, content, tokens_used, created_at
       FROM chat_history WHERE user_id=? AND session_id=? ORDER BY created_at ASC`,
      [req.user.id, req.params.session_id]
    )).rows;
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.getSessions = async (req, res, next) => {
  try {
    const rows = (await query(
      `SELECT session_id,
         MIN(created_at) as started,
         MAX(created_at) as last_message,
         COUNT(*) as messages,
         (SELECT content FROM chat_history ch2
          WHERE ch2.session_id=ch.session_id AND ch2.role='user'
          ORDER BY ch2.created_at ASC LIMIT 1) as first_message
       FROM chat_history ch WHERE user_id=?
       GROUP BY session_id ORDER BY last_message DESC LIMIT 20`,
      [req.user.id]
    )).rows;
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.clearSession = async (req, res, next) => {
  try {
    const { session_id } = req.params;
    await query(
      `DELETE FROM chat_history WHERE user_id=? AND session_id=?`,
      [req.user.id, session_id]
    );
    res.json({ success: true, message: 'Chat cleared' });
  } catch (err) { next(err); }
};

exports.deleteSession = async (req, res, next) => {
  try {
    await query(
      `DELETE FROM chat_history WHERE user_id=? AND session_id=?`,
      [req.user.id, req.params.session_id]
    );
    res.json({ success: true, message: 'Session deleted' });
  } catch (err) { next(err); }
};

exports.getRiskPrediction = async (req, res, next) => {
  try {
    const { mine_id } = req.params;
    const mine = (await query('SELECT * FROM mines WHERE id=?', [mine_id])).rows[0];
    if (!mine) return res.status(404).json({ success: false, message: 'Mine not found' });

    const [v, inc, env, docs] = await Promise.all([
      query(`SELECT severity, COUNT(*) as c FROM violations WHERE mine_id=? AND status!='closed' GROUP BY severity`, [mine_id]),
      query(`SELECT severity, COUNT(*) as c FROM incidents WHERE mine_id=? AND incident_date>=datetime('now','-6 months') GROUP BY severity`, [mine_id]),
      query(`SELECT COUNT(*) as alerts FROM environmental_readings WHERE mine_id=? AND status IN ('warning','critical') AND recorded_at>=datetime('now','-30 days')`, [mine_id]),
      query(`SELECT COUNT(*) as expired FROM documents WHERE mine_id=? AND status='expired'`, [mine_id]),
    ]);

    const vm = Object.fromEntries(v.rows.map(r => [r.severity, parseInt(r.c)]));
    const im = Object.fromEntries(inc.rows.map(r => [r.severity, parseInt(r.c)]));
    const factors = [
      { name: 'Critical Violations',    weight: 25, value: (vm.critical||0)*10, max: 100 },
      { name: 'High Violations',        weight: 15, value: (vm.high||0)*5,      max: 50  },
      { name: 'Fatal Incidents (6mo)',  weight: 20, value: (im.fatal||0)*20,    max: 100 },
      { name: 'Serious Incidents (6mo)',weight: 15, value: (im.serious||0)*8,   max: 50  },
      { name: 'Env Alerts (30d)',       weight: 10, value: parseInt(env.rows[0].alerts)*5, max: 50 },
      { name: 'Expired Documents',      weight: 10, value: parseInt(docs.rows[0].expired)*10, max: 50 },
      { name: 'Current Risk',           weight:  5, value: parseFloat(mine.risk_score), max: 100 },
    ];
    const overall = Math.min(100, factors.reduce((a, f) => a + Math.min(f.max, f.value) * (f.weight / 100), 0));
    const level = overall >= 75 ? 'CRITICAL' : overall >= 50 ? 'HIGH' : overall >= 25 ? 'MEDIUM' : 'LOW';
    const preds = [
      { category: 'Safety',             probability: Math.min(95, 20 + overall * 0.7).toFixed(1),                       description: 'Probability of safety incident in next 30 days' },
      { category: 'Environmental',      probability: Math.min(95, 15 + parseInt(env.rows[0].alerts) * 8).toFixed(1),    description: 'Environmental violation probability in 30 days' },
      { category: 'Compliance Failure', probability: Math.min(95, 100 - parseFloat(mine.compliance_score)).toFixed(1),  description: 'Compliance failure probability this quarter' },
    ];
    const recs = [];
    if (vm.critical > 0)                   recs.push({ priority: 'CRITICAL', action: `Address ${vm.critical} critical violation(s) immediately.` });
    if (im.fatal > 0)                      recs.push({ priority: 'CRITICAL', action: 'Mandatory DGMS inquiry for fatal incidents.' });
    if (parseFloat(mine.compliance_score) < 60) recs.push({ priority: 'HIGH', action: 'Compliance below threshold. Implement 30-day improvement plan.' });
    if (!recs.length)                      recs.push({ priority: 'LOW', action: 'Continue current practices. Schedule next review.' });

    res.json({ success: true, data: { mine_name: mine.name, overall_risk: parseFloat(overall.toFixed(1)), risk_level: level, risk_factors: factors, predictions: preds, recommendations: recs } });
  } catch (err) { next(err); }
};

exports.getUsersList = async (req, res, next) => {
  try {
    const rows = (await query('SELECT id,full_name,email,role,designation,department,is_active,last_login,created_at FROM users ORDER BY role,full_name')).rows;
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active, role, designation, department, mine_id } = req.body;
    const sets = [`updated_at=datetime('now')`], p = [];
    if (is_active !== undefined) { sets.push('is_active=?');  p.push(is_active ? 1 : 0); }
    if (role)        { sets.push('role=?');        p.push(role); }
    if (designation) { sets.push('designation=?'); p.push(designation); }
    if (department)  { sets.push('department=?');  p.push(department); }
    if (mine_id !== undefined) { sets.push('mine_id=?'); p.push(mine_id); }
    p.push(id);
    await query(`UPDATE users SET ${sets.join(',')} WHERE id=?`, p);
    const row = (await query('SELECT id,full_name,email,role,is_active,mine_id FROM users WHERE id=?', [id])).rows[0];
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
};

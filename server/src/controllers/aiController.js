const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const KB = {
  greetings: ['hello','hi','hey','namaste'],
  methane:   { kw:['methane','ch4','gas','explosion','firedamp'], ans:`**Methane (CH4) Safety – CMR 2017 Reg.104:**\n\n• Permissible limit: **0.5%** in general body of air\n• At 1.25% → stop work, evacuate\n• At 1.5% → switch off electrical equipment\n• Continuous monitoring mandatory in all underground workings\n• DGMS must be notified if levels exceed 1.5%\n\n*Reference: CMR 2017, Reg. 104–112*` },
  ventilation:{ kw:['ventilation','airflow','fan','air'], ans:`**Ventilation Requirements – CMR 2017:**\n\n• Minimum air velocity: **0.3 m/s** at every working face\n• Air quantity: minimum **6 m³/min** per worker\n• Main fan must have automatic recording devices\n• Monthly ventilation survey mandatory\n\n*Reference: CMR 2017, Reg. 103–115*` },
  safety:    { kw:['safety','accident','injury','ppe','protective'], ans:`**Mine Safety Requirements:**\n\n**PPE:** Hard hat, safety boots, high-vis vest, self-rescuer (underground)\n\n**Accident Reporting (Mines Act 1952):**\n• Fatal: within **2 hours** to DGMS + District Magistrate\n• Serious: within **4 hours** to DGMS\n• Form III within 10 days\n\n**Emergency:** Min. 2 escape routes, quarterly drills mandatory` },
  environmental:{ kw:['environment','pollution','dust','water','noise','pm10','discharge'], ans:`**Environmental Standards:**\n\n**Air (NAAQS):** PM10 ≤100 μg/m³ · PM2.5 ≤60 · SO2 ≤80 · NO2 ≤80\n**Water (CPCB):** pH 6.5–8.5 · SS <100 mg/L · Iron <3 mg/L\n**Dust Control:** Water sprinklers at crush/load points, 30m green belt\n\n*Reference: EP Act 1986, NAAQS 2009*` },
  compliance: { kw:['compliance','score','penalty','fine','violation','regulation'], ans:`**Compliance Framework:**\n\n**Key Laws:** Mines Act 1952, CMR 2017, MMDR Act 1957, EP Act 1986\n\n**Penalty Structure:**\n• Minor: ₹25,000 – ₹1,00,000\n• Major: ₹1,00,000 – ₹5,00,000\n• Fatal (negligence): up to ₹10,00,000 + imprisonment\n\n**Score Thresholds:** <60% → enhanced monitoring · <40% → show cause · <25% → suspension` },
  inspection: { kw:['inspection','inspector','audit','survey'], ans:`**Inspection Framework:**\n\n• Routine: every **3 months** by DGMS Inspector\n• Annual Safety Audit mandatory\n• Inspector can enter any mine at any time (Mines Act S.8)\n• Inspector can issue Prohibition/Improvement Notices\n• Manager must rectify defects within stipulated time` },
  license:   { kw:['license','licence','permit','clearance','renewal','expiry'], ans:`**Mining License Requirements:**\n\n• Coal mine lease: initial **50 years** (MMDR Act 1957)\n• Apply for renewal **2 years before** expiry\n• Environmental Clearance: required for >5 ha, valid 10 years\n• Annual royalty payment mandatory\n• Apply EC via MoEFCC PARIVESH portal` },
};

function respond(msg){
  const lo=msg.toLowerCase();
  if(KB.greetings.some(g=>lo.includes(g)))
    return `**Namaste! 🙏 Welcome to KhanNetra AI Assistant**\n\nI can help with:\n• CMR 2017 – Coal Mines Regulations\n• Safety & accident reporting\n• Environmental standards\n• Inspection procedures\n• Licensing & permits\n• Penalties & violations\n\nAsk me anything about coal mine compliance!`;
  for(const[,v] of Object.entries(KB)){
    if(v.kw&&v.kw.some(k=>lo.includes(k))) return v.ans;
  }
  return `I understand you're asking about: **"${msg}"**\n\nTopics I can help with:\n• Methane & gas safety (CMR 2017, Reg. 104–112)\n• Ventilation requirements\n• Accident reporting procedures\n• Environmental compliance (NAAQS, CPCB)\n• Inspection framework (DGMS)\n• License & permit requirements\n• PPE and worker safety\n\nPlease rephrase or ask about any of the above.\n\n*For urgent matters: DGMS Helpline 1800-345-6789*`;
}

exports.chat = async (req, res, next) => {
  try {
    const {message,session_id}=req.body;
    if(!message?.trim()) return res.status(400).json({success:false,message:'Message required'});
    const sid=session_id||uuidv4();
    await query(`INSERT INTO chat_history (id,user_id,session_id,role,content) VALUES (?,?,?,'user',?)`,[uuidv4(),req.user.id,sid,message]);
    let text='';
    if(process.env.OPENAI_API_KEY?.startsWith('sk-')){
      try{
        const {default:OpenAI}=await import('openai');
        const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
        const hist=(await query(`SELECT role,content FROM chat_history WHERE user_id=? AND session_id=? ORDER BY created_at ASC LIMIT 10`,[req.user.id,sid])).rows;
        const sys=`You are KhanNetra AI, an expert on Indian coal mine governance and DGMS regulations. Answer concisely about CMR 2017, Mines Act 1952, MMDR Act, environmental standards, and compliance. Cite regulation sections.`;
        const res2=await openai.chat.completions.create({model:'gpt-3.5-turbo',messages:[{role:'system',content:sys},...hist.map(h=>({role:h.role,content:h.content}))],max_tokens:500});
        text=res2.choices[0].message.content;
      }catch{ text=respond(message); }
    } else { text=respond(message); }
    await query(`INSERT INTO chat_history (id,user_id,session_id,role,content) VALUES (?,?,?,'assistant',?)`,[uuidv4(),req.user.id,sid,text]);
    res.json({success:true,data:{message:text,session_id:sid,timestamp:new Date()}});
  } catch(err){next(err);}
};

exports.getChatHistory = async (req, res, next) => {
  try {
    const rows=(await query(`SELECT role,content,created_at FROM chat_history WHERE user_id=? AND session_id=? ORDER BY created_at ASC`,[req.user.id,req.params.session_id])).rows;
    res.json({success:true,data:rows});
  } catch(err){next(err);}
};

exports.getSessions = async (req, res, next) => {
  try {
    const rows=(await query(`SELECT session_id,MIN(created_at) as started,MAX(created_at) as last_message,COUNT(*) as messages FROM chat_history WHERE user_id=? GROUP BY session_id ORDER BY last_message DESC LIMIT 10`,[req.user.id])).rows;
    res.json({success:true,data:rows});
  } catch(err){next(err);}
};

exports.getRiskPrediction = async (req, res, next) => {
  try {
    const {mine_id}=req.params;
    const mine=(await query('SELECT * FROM mines WHERE id=?',[mine_id])).rows[0];
    if(!mine) return res.status(404).json({success:false,message:'Mine not found'});
    const [v,inc,env,docs]=await Promise.all([
      query(`SELECT severity,COUNT(*) as c FROM violations WHERE mine_id=? AND status!='closed' GROUP BY severity`,[mine_id]),
      query(`SELECT severity,COUNT(*) as c FROM incidents WHERE mine_id=? AND incident_date>=datetime('now','-6 months') GROUP BY severity`,[mine_id]),
      query(`SELECT COUNT(*) as alerts FROM environmental_readings WHERE mine_id=? AND status IN ('warning','critical') AND recorded_at>=datetime('now','-30 days')`,[mine_id]),
      query(`SELECT COUNT(*) as expired FROM documents WHERE mine_id=? AND status='expired'`,[mine_id]),
    ]);
    const vm=Object.fromEntries(v.rows.map(r=>[r.severity,parseInt(r.c)]));
    const im=Object.fromEntries(inc.rows.map(r=>[r.severity,parseInt(r.c)]));
    const factors=[
      {name:'Critical Violations',weight:25,value:(vm.critical||0)*10,max:100},
      {name:'High Violations',weight:15,value:(vm.high||0)*5,max:50},
      {name:'Fatal Incidents (6mo)',weight:20,value:(im.fatal||0)*20,max:100},
      {name:'Serious Incidents (6mo)',weight:15,value:(im.serious||0)*8,max:50},
      {name:'Env Alerts (30d)',weight:10,value:parseInt(env.rows[0].alerts)*5,max:50},
      {name:'Expired Documents',weight:10,value:parseInt(docs.rows[0].expired)*10,max:50},
      {name:'Current Risk',weight:5,value:parseFloat(mine.risk_score),max:100},
    ];
    const overall=Math.min(100,factors.reduce((a,f)=>a+Math.min(f.max,f.value)*(f.weight/100),0));
    const level=overall>=75?'CRITICAL':overall>=50?'HIGH':overall>=25?'MEDIUM':'LOW';
    const preds=[
      {category:'Safety',probability:Math.min(95,20+overall*0.7).toFixed(1),description:'Probability of safety incident in next 30 days'},
      {category:'Environmental',probability:Math.min(95,15+parseInt(env.rows[0].alerts)*8).toFixed(1),description:'Environmental violation probability in 30 days'},
      {category:'Compliance Failure',probability:Math.min(95,100-parseFloat(mine.compliance_score)).toFixed(1),description:'Compliance failure probability this quarter'},
    ];
    const recs=[];
    if(vm.critical>0) recs.push({priority:'CRITICAL',action:`Address ${vm.critical} critical violation(s) immediately.`});
    if(im.fatal>0) recs.push({priority:'CRITICAL',action:'Mandatory DGMS inquiry required for fatal incidents.'});
    if(parseFloat(mine.compliance_score)<60) recs.push({priority:'HIGH',action:'Compliance below threshold. Implement improvement plan.'});
    if(!recs.length) recs.push({priority:'LOW',action:'Continue current practices. Schedule next review.'});
    res.json({success:true,data:{mine_name:mine.name,overall_risk:parseFloat(overall.toFixed(1)),risk_level:level,risk_factors:factors,predictions:preds,recommendations:recs}});
  } catch(err){next(err);}
};

exports.getUsersList = async (req, res, next) => {
  try {
    const rows=(await query('SELECT id,full_name,email,role,designation,department,is_active,last_login,created_at FROM users ORDER BY role,full_name')).rows;
    res.json({success:true,data:rows});
  } catch(err){next(err);}
};

exports.updateUser = async (req, res, next) => {
  try {
    const {id}=req.params;
    const {is_active,role,designation,department,mine_id}=req.body;
    const sets=[`updated_at=datetime('now')`],p=[];
    if(is_active!==undefined){sets.push('is_active=?');p.push(is_active?1:0);}
    if(role){sets.push('role=?');p.push(role);}
    if(designation){sets.push('designation=?');p.push(designation);}
    if(department){sets.push('department=?');p.push(department);}
    if(mine_id!==undefined){sets.push('mine_id=?');p.push(mine_id);}
    p.push(id);
    await query(`UPDATE users SET ${sets.join(',')} WHERE id=?`,p);
    const row=(await query('SELECT id,full_name,email,role,is_active,mine_id FROM users WHERE id=?',[id])).rows[0];
    res.json({success:true,data:row});
  } catch(err){next(err);}
};

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

exports.getRecords = async (req, res, next) => {
  try {
    const {mine_id,status,category}=req.query;
    let c=[],p=[];
    const mId=req.user.role==='mine_manager'?req.user.mine_id:mine_id;
    if(mId){c.push('cr.mine_id=?');p.push(mId);}
    if(status){c.push('cr.status=?');p.push(status);}
    if(category){c.push('cr.category=?');p.push(category);}
    const w=c.length?`WHERE ${c.join(' AND ')}`:'';
    const rows=(await query(
      `SELECT cr.*,m.name as mine_name,u.full_name as verified_by_name
       FROM compliance_records cr JOIN mines m ON cr.mine_id=m.id LEFT JOIN users u ON cr.verified_by=u.id
       ${w} ORDER BY CASE cr.status WHEN 'non_compliant' THEN 1 WHEN 'warning' THEN 2 WHEN 'pending' THEN 3 ELSE 4 END`,p)).rows;
    res.json({success:true,data:rows});
  } catch(err){next(err);}
};

exports.create = async (req, res, next) => {
  try {
    const {mine_id,category,parameter_name,required_value,actual_value,status,score,notes,due_date}=req.body;
    const id=uuidv4();
    await query(
      `INSERT INTO compliance_records (id,mine_id,category,parameter_name,required_value,actual_value,status,score,notes,verified_by,verification_date,due_date) VALUES (?,?,?,?,?,?,?,?,?,?,date('now'),?)`,
      [id,mine_id,category,parameter_name,required_value,actual_value,status||'pending',score||0,notes,req.user.id,due_date]);
    await recalc(mine_id);
    res.status(201).json({success:true,data:(await query('SELECT * FROM compliance_records WHERE id=?',[id])).rows[0]});
  } catch(err){next(err);}
};

exports.update = async (req, res, next) => {
  try {
    const {id}=req.params;
    const allowed=['actual_value','status','score','notes','due_date'];
    const sets=[`verified_by=?`,`verification_date=date('now')`,`updated_at=datetime('now')`],p=[req.user.id];
    for(const k of allowed){if(req.body[k]!==undefined){sets.push(`${k}=?`);p.push(req.body[k]);}}
    p.push(id);
    await query(`UPDATE compliance_records SET ${sets.join(',')} WHERE id=?`,p);
    const row=(await query('SELECT * FROM compliance_records WHERE id=?',[id])).rows[0];
    if(!row) return res.status(404).json({success:false,message:'Not found'});
    await recalc(row.mine_id);
    res.json({success:true,data:row});
  } catch(err){next(err);}
};

exports.getMineComplianceScore = async (req, res, next) => {
  try {
    const {id}=req.params;
    const bycat=(await query(
      `SELECT category,AVG(score) as avg_score,COUNT(*) as total,
         SUM(CASE WHEN status='compliant' THEN 1 ELSE 0 END) as compliant,
         SUM(CASE WHEN status='non_compliant' THEN 1 ELSE 0 END) as non_compliant,
         SUM(CASE WHEN status='warning' THEN 1 ELSE 0 END) as warning
       FROM compliance_records WHERE mine_id=? GROUP BY category`,[id])).rows;
    const overall=(await query('SELECT AVG(score) as overall_score FROM compliance_records WHERE mine_id=?',[id])).rows[0];
    res.json({success:true,data:{by_category:bycat,overall_score:overall.overall_score}});
  } catch(err){next(err);}
};

exports.runAiAssessment = async (req, res, next) => {
  try {
    const {mine_id}=req.params;
    const mine=(await query('SELECT * FROM mines WHERE id=?',[mine_id])).rows[0];
    if(!mine) return res.status(404).json({success:false,message:'Mine not found'});
    const [v,inc,comp,env]= await Promise.all([
      query(`SELECT COUNT(*) as total,SUM(CASE severity WHEN 'critical' THEN 1 ELSE 0 END) as critical,SUM(CASE WHEN status!='closed' THEN 1 ELSE 0 END) as open FROM violations WHERE mine_id=?`,[mine_id]),
      query(`SELECT COUNT(*) as total,SUM(fatalities_count) as fatalities FROM incidents WHERE mine_id=? AND incident_date>=datetime('now','-1 year')`,[mine_id]),
      query(`SELECT AVG(score) as avg FROM compliance_records WHERE mine_id=?`,[mine_id]),
      query(`SELECT COUNT(*) as alerts FROM environmental_readings WHERE mine_id=? AND status IN ('warning','critical') AND recorded_at>=datetime('now','-7 days')`,[mine_id]),
    ]);
    const vd=v.rows[0],id2=inc.rows[0],cd=comp.rows[0],ed=env.rows[0];
    let risk=0,recs=[];
    if(parseInt(vd.critical)>0){risk+=30;recs.push({priority:'CRITICAL',action:`Address ${vd.critical} critical violation(s) immediately.`});}
    if(parseInt(vd.open)>5){risk+=15;recs.push({priority:'HIGH',action:'Expedite closure of open violations.'});}
    if(parseInt(id2.fatalities)>0){risk+=25;recs.push({priority:'CRITICAL',action:'Conduct safety overhaul after fatal incidents.'});}
    if(parseFloat(cd.avg||50)<60){risk+=20;recs.push({priority:'HIGH',action:'Implement 30-day compliance improvement plan.'});}
    if(parseInt(ed.alerts)>3){risk+=10;recs.push({priority:'MEDIUM',action:'Address environmental parameter exceedances.'});}
    if(mine.license_expiry&&new Date(mine.license_expiry)<new Date()){risk+=20;recs.push({priority:'CRITICAL',action:'Renew expired mining license immediately.'});}
    if(!recs.length) recs.push({priority:'LOW',action:'Continue current practices. Schedule next review.'});
    const riskScore=Math.min(100,risk);
    const level=riskScore>=70?'CRITICAL':riskScore>=50?'HIGH':riskScore>=30?'MEDIUM':'LOW';
    await query(`UPDATE mines SET risk_score=?,updated_at=datetime('now') WHERE id=?`,[riskScore,mine_id]);
    res.json({success:true,data:{mine_name:mine.name,risk_score:riskScore,risk_level:level,compliance_score:parseFloat(cd.avg||0).toFixed(1),recommendations:recs,summary:`Risk level: ${level}. ${vd.open} open violations (${vd.critical} critical), ${id2.total} incidents (${id2.fatalities} fatalities), ${ed.alerts} env alerts.`}});
  } catch(err){next(err);}
};

exports.getRegulations = async (req, res, next) => {
  try {
    const {category,search}=req.query;
    let c=[`is_active=1`],p=[];
    if(category){c.push('category=?');p.push(category);}
    if(search){c.push(`(title LIKE ? OR description LIKE ? OR code LIKE ?)`);p.push(`%${search}%`,`%${search}%`,`%${search}%`);}
    const rows=(await query(`SELECT * FROM regulations WHERE ${c.join(' AND ')} ORDER BY category,code`,p)).rows;
    res.json({success:true,data:rows});
  } catch(err){next(err);}
};

exports.createRegulation = async (req, res, next) => {
  try {
    const {code,title,category,description,effective_date,issuing_authority,penalty_range,applicable_mine_types}=req.body;
    const id=uuidv4();
    await query(`INSERT INTO regulations (id,code,title,category,description,effective_date,issuing_authority,penalty_range,applicable_mine_types) VALUES (?,?,?,?,?,?,?,?,?)`,
      [id,code,title,category,description,effective_date,issuing_authority,penalty_range,JSON.stringify(applicable_mine_types||[])]);
    res.status(201).json({success:true,data:(await query('SELECT * FROM regulations WHERE id=?',[id])).rows[0]});
  } catch(err){next(err);}
};

async function recalc(mineId){
  try{
    const r=(await query('SELECT AVG(score) as avg FROM compliance_records WHERE mine_id=?',[mineId])).rows[0];
    await query(`UPDATE mines SET compliance_score=?,updated_at=datetime('now') WHERE id=?`,[parseFloat(r.avg||50),mineId]);
  }catch{}
}

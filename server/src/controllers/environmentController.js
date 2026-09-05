const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const THRESH = {PM10:{max:100,unit:'μg/m³'},PM2_5:{max:60,unit:'μg/m³'},SO2:{max:80,unit:'μg/m³'},NO2:{max:80,unit:'μg/m³'},CH4:{max:0.5,unit:'%'},CO:{max:50,unit:'ppm'},pH:{min:6.5,max:8.5,unit:'pH'},TDS:{max:2100,unit:'mg/L'},Noise:{max:75,unit:'dB'},Dust:{max:3,unit:'mg/m³'}};

exports.getReadings = async (req, res, next) => {
  try {
    const {mine_id,parameter,reading_type,status,page=1,limit=50}=req.query;
    const off=(page-1)*limit;
    let c=[],p=[];
    const mId=req.user.role==='mine_manager'?req.user.mine_id:mine_id;
    if(mId){c.push('e.mine_id=?');p.push(mId);}
    if(parameter){c.push('e.parameter=?');p.push(parameter);}
    if(reading_type){c.push('e.reading_type=?');p.push(reading_type);}
    if(status){c.push('e.status=?');p.push(status);}
    const w=c.length?`WHERE ${c.join(' AND ')}`:'';
    const total=(await query(`SELECT COUNT(*) as c FROM environmental_readings e ${w}`,p)).rows[0].c;
    const rows=(await query(`SELECT e.*,m.name as mine_name FROM environmental_readings e JOIN mines m ON e.mine_id=m.id ${w} ORDER BY e.recorded_at DESC LIMIT ? OFFSET ?`,[...p,limit,off])).rows;
    res.json({success:true,data:rows,pagination:{total,page:+page,limit:+limit}});
  } catch(err){next(err);}
};

exports.createReading = async (req, res, next) => {
  try {
    const {mine_id,reading_type,parameter,value,unit,location,notes}=req.body;
    if(!mine_id||!parameter||value===undefined) return res.status(400).json({success:false,message:'mine_id,parameter,value required'});
    const t=THRESH[parameter]||{};
    const v=parseFloat(value);
    let status='normal';
    if(t.max&&v>t.max) status=v>t.max*1.5?'critical':'warning';
    if(t.min&&v<t.min) status='alert';
    const id=uuidv4();
    await query(`INSERT INTO environmental_readings (id,mine_id,reading_type,parameter,value,unit,threshold_min,threshold_max,status,location,recorded_by,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id,mine_id,reading_type||'Manual',parameter,v,unit||t.unit||'',t.min||0,t.max||0,status,location,req.user.id,notes]);
    if(['warning','critical'].includes(status)){
      const admins=(await query(`SELECT id FROM users WHERE role IN ('admin','environment_officer')`)).rows;
      for(const a of admins) await query(`INSERT INTO notifications (id,user_id,mine_id,title,message,type,priority) VALUES (?,?,?,?,?,?,?)`,
        [uuidv4(),a.id,mine_id,`⚠️ ${parameter} ${status.toUpperCase()}`,`${parameter} at ${v} exceeds limit (${t.max} ${t.unit||''})`,'warning',status==='critical'?'critical':'high']);
    }
    const row=(await query('SELECT * FROM environmental_readings WHERE id=?',[id])).rows[0];
    res.status(201).json({success:true,data:row});
  } catch(err){next(err);}
};

exports.getLatestByMine = async (req, res, next) => {
  try {
    // SQLite: get latest per parameter using GROUP BY + MAX
    const rows=(await query(
      `SELECT e.parameter,e.value,e.unit,e.status,e.location,e.recorded_at,e.reading_type,e.threshold_min,e.threshold_max
       FROM environmental_readings e
       INNER JOIN (SELECT parameter,MAX(recorded_at) as max_at FROM environmental_readings WHERE mine_id=? GROUP BY parameter) latest
       ON e.parameter=latest.parameter AND e.recorded_at=latest.max_at
       WHERE e.mine_id=?`,[req.params.id,req.params.id])).rows;
    res.json({success:true,data:rows});
  } catch(err){next(err);}
};

exports.getTrends = async (req, res, next) => {
  try {
    const {mine_id,parameter,days=7}=req.query;
    if(!mine_id||!parameter) return res.status(400).json({success:false,message:'mine_id and parameter required'});
    const rows=(await query(
      `SELECT strftime('%Y-%m-%dT%H:00:00',recorded_at) as time,
         AVG(value) as avg_value,MIN(value) as min_value,MAX(value) as max_value
       FROM environmental_readings
       WHERE mine_id=? AND parameter=? AND recorded_at>=datetime('now','-${parseInt(days)} days')
       GROUP BY strftime('%Y-%m-%dT%H:00:00',recorded_at) ORDER BY time ASC`,[mine_id,parameter])).rows;
    res.json({success:true,data:rows});
  } catch(err){next(err);}
};

exports.getAlerts = async (req, res, next) => {
  try {
    const mf=req.user.role==='mine_manager'&&req.user.mine_id?`AND e.mine_id='${req.user.mine_id}'`:'';
    const rows=(await query(
      `SELECT e.*,m.name as mine_name FROM environmental_readings e JOIN mines m ON e.mine_id=m.id
       WHERE e.status IN ('warning','critical') ${mf}
       GROUP BY e.mine_id,e.parameter ORDER BY e.recorded_at DESC`)).rows;
    res.json({success:true,data:rows});
  } catch(err){next(err);}
};

exports.getDashboardSummary = async (req, res, next) => {
  try {
    const mf=req.user.role==='mine_manager'&&req.user.mine_id?`AND e.mine_id='${req.user.mine_id}'`:'';
    const rows=(await query(
      `SELECT m.name as mine_name,m.id as mine_id,
         SUM(CASE WHEN e.status='critical' THEN 1 ELSE 0 END) as critical_count,
         SUM(CASE WHEN e.status='warning'  THEN 1 ELSE 0 END) as warning_count,
         SUM(CASE WHEN e.status='normal'   THEN 1 ELSE 0 END) as normal_count
       FROM environmental_readings e JOIN mines m ON e.mine_id=m.id
       WHERE e.recorded_at>=datetime('now','-24 hours') ${mf}
       GROUP BY m.id,m.name ORDER BY critical_count DESC`)).rows;
    res.json({success:true,data:rows});
  } catch(err){next(err);}
};

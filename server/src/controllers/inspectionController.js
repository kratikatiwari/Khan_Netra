const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res, next) => {
  try {
    const {mine_id,status,page=1,limit=20}=req.query;
    const off=(page-1)*limit;
    let c=[],p=[];
    if(req.user.role==='mine_manager'&&req.user.mine_id){c.push('ins.mine_id=?');p.push(req.user.mine_id);}
    else if(mine_id){c.push('ins.mine_id=?');p.push(mine_id);}
    if(req.user.role==='inspector'){c.push('ins.inspector_id=?');p.push(req.user.id);}
    if(status){c.push('ins.status=?');p.push(status);}
    const w=c.length?`WHERE ${c.join(' AND ')}`:'';
    const total=(await query(`SELECT COUNT(*) as c FROM inspections ins ${w}`,p)).rows[0].c;
    const rows=(await query(`SELECT ins.*,m.name as mine_name,m.state,u.full_name as inspector_name FROM inspections ins JOIN mines m ON ins.mine_id=m.id LEFT JOIN users u ON ins.inspector_id=u.id ${w} ORDER BY ins.scheduled_date DESC LIMIT ? OFFSET ?`,[...p,limit,off])).rows;
    res.json({success:true,data:rows,pagination:{total,page:+page,limit:+limit}});
  } catch(err){next(err);}
};

exports.getById = async (req, res, next) => {
  try {
    const ins=(await query(`SELECT ins.*,m.name as mine_name,m.state,m.type as mine_type,u.full_name as inspector_name FROM inspections ins JOIN mines m ON ins.mine_id=m.id LEFT JOIN users u ON ins.inspector_id=u.id WHERE ins.id=?`,[req.params.id])).rows[0];
    if(!ins) return res.status(404).json({success:false,message:'Not found'});
    const checklist=(await query('SELECT * FROM inspection_checklist WHERE inspection_id=? ORDER BY category',[req.params.id])).rows;
    res.json({success:true,data:{...ins,checklist}});
  } catch(err){next(err);}
};

exports.create = async (req, res, next) => {
  try {
    const {mine_id,type,scheduled_date,inspector_id}=req.body;
    if(!mine_id||!type||!scheduled_date) return res.status(400).json({success:false,message:'mine_id,type,scheduled_date required'});
    const cnt=(await query('SELECT COUNT(*) as c FROM inspections')).rows[0].c;
    const num=`INS-${new Date().getFullYear()}-${String(cnt+1).padStart(4,'0')}`;
    const id=uuidv4();
    await query(`INSERT INTO inspections (id,inspection_number,mine_id,type,scheduled_date,inspector_id,status) VALUES (?,?,?,?,?,?,'scheduled')`,
      [id,num,mine_id,type,scheduled_date,inspector_id||req.user.id]);
    await query(`UPDATE mines SET next_inspection_date=?,updated_at=datetime('now') WHERE id=?`,[scheduled_date,mine_id]);
    await query(`INSERT INTO notifications (id,user_id,mine_id,title,message,type,priority) VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(),inspector_id||req.user.id,mine_id,'Inspection Scheduled',`A ${type} inspection is scheduled for ${scheduled_date}`,'info','medium']);
    const row=(await query('SELECT * FROM inspections WHERE id=?',[id])).rows[0];
    res.status(201).json({success:true,message:'Inspection scheduled',data:row});
  } catch(err){next(err);}
};

exports.update = async (req, res, next) => {
  try {
    const {id}=req.params;
    const allowed=['status','completed_date','overall_score','findings','recommendations','follow_up_required','follow_up_date','checklist_completed'];
    const sets=[],p=[];
    for(const k of allowed){if(req.body[k]!==undefined){sets.push(`${k}=?`);p.push(req.body[k]);}}
    if(req.body.status==='completed'&&!req.body.completed_date) sets.push(`completed_date=date('now')`);
    sets.push(`updated_at=datetime('now')`);p.push(id);
    await query(`UPDATE inspections SET ${sets.join(',')} WHERE id=?`,p);
    const row=(await query('SELECT * FROM inspections WHERE id=?',[id])).rows[0];
    if(!row) return res.status(404).json({success:false,message:'Not found'});
    if(row.status==='completed') await query(`UPDATE mines SET last_inspection_date=?,updated_at=datetime('now') WHERE id=?`,[row.completed_date,row.mine_id]);
    res.json({success:true,data:row});
  } catch(err){next(err);}
};

exports.saveChecklist = async (req, res, next) => {
  try {
    const {inspection_id,items}=req.body;
    if(!items||!Array.isArray(items)) return res.status(400).json({success:false,message:'items array required'});
    await query('DELETE FROM inspection_checklist WHERE inspection_id=?',[inspection_id]);
    let total=0;
    for(const item of items){
      await query(`INSERT INTO inspection_checklist (id,inspection_id,category,item_description,is_compliant,score,remarks) VALUES (?,?,?,?,?,?,?)`,
        [uuidv4(),inspection_id,item.category,item.item_description,item.is_compliant?1:0,item.score||0,item.remarks]);
      total+=item.score||0;
    }
    const avg=items.length?total/items.length:0;
    await query(`UPDATE inspections SET checklist_completed=1,overall_score=?,updated_at=datetime('now') WHERE id=?`,[avg,inspection_id]);
    res.json({success:true,message:'Checklist saved',data:{overall_score:avg}});
  } catch(err){next(err);}
};

exports.getSchedule = async (req, res, next) => {
  try {
    const {days=30}=req.query;
    const mf=req.user.role==='mine_manager'&&req.user.mine_id?`AND ins.mine_id='${req.user.mine_id}'`:'';
    const inf=req.user.role==='inspector'?`AND ins.inspector_id='${req.user.id}'`:'';
    const rows=(await query(
      `SELECT ins.*,m.name as mine_name,m.state,u.full_name as inspector_name
       FROM inspections ins JOIN mines m ON ins.mine_id=m.id LEFT JOIN users u ON ins.inspector_id=u.id
       WHERE ins.scheduled_date BETWEEN date('now') AND date('now','+${parseInt(days)} days')
       AND ins.status IN ('scheduled','in_progress') ${mf} ${inf} ORDER BY ins.scheduled_date ASC`)).rows;
    res.json({success:true,data:rows});
  } catch(err){next(err);}
};

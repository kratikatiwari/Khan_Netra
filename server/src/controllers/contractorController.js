'use strict';
const { query } = require('../config/database');
const { v4: uuid } = require('uuid');

exports.getAll = async (req, res, next) => {
  try {
    const { mine_id, status, page = 1, limit = 20 } = req.query;
    const off = (page - 1) * limit;
    let c = [], p = [];
    const mId = req.user.role === 'mine_manager' ? req.user.mine_id : mine_id;
    if (mId)    { c.push('c.mine_id = ?'); p.push(mId); }
    if (status) { c.push('c.status = ?');  p.push(status); }
    const w = c.length ? `WHERE ${c.join(' AND ')}` : '';
    const total = (await query(`SELECT COUNT(*) as n FROM contractors c ${w}`, p)).rows[0].n;
    const rows  = (await query(
      `SELECT c.*, m.name as mine_name FROM contractors c
       JOIN mines m ON c.mine_id = m.id ${w}
       ORDER BY c.compliance_score ASC LIMIT ? OFFSET ?`,
      [...p, limit, off]
    )).rows;
    res.json({ success: true, data: rows, pagination: { total, page: +page, limit: +limit } });
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const r = (await query(
      `SELECT c.*, m.name as mine_name FROM contractors c JOIN mines m ON c.mine_id = m.id WHERE c.id = ?`,
      [req.params.id]
    )).rows[0];
    if (!r) return res.status(404).json({ success: false, message: 'Contractor not found' });
    res.json({ success: true, data: r });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, registration_number, mine_id, work_type, contract_start, contract_end,
            workers_count, contact_name, contact_phone, contact_email, notes } = req.body;
    if (!name || !mine_id || !work_type)
      return res.status(400).json({ success: false, message: 'name, mine_id, work_type required' });
    const id = uuid();
    await query(
      `INSERT INTO contractors (id,name,registration_number,mine_id,work_type,contract_start,contract_end,
        workers_count,contact_name,contact_phone,contact_email,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, name, registration_number, mine_id, work_type, contract_start, contract_end,
       workers_count || 0, contact_name, contact_phone, contact_email, notes]
    );
    // Audit
    await query(
      `INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,description,mine_id,ip_address) VALUES (?,?,?,?,?,?,?,?)`,
      [uuid(), req.user.id, 'CREATE', 'contractor', id, `Created contractor: ${name}`, mine_id, req.ip]
    );
    const row = (await query('SELECT * FROM contractors WHERE id=?', [id])).rows[0];
    res.status(201).json({ success: true, message: 'Contractor added', data: row });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = ['name','registration_number','work_type','contract_start','contract_end',
      'safety_score','compliance_score','workers_count','status','contact_name',
      'contact_phone','contact_email','notes','last_inspection_date'];
    const sets = [], p = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { sets.push(`${k} = ?`); p.push(req.body[k]); }
    }
    sets.push(`updated_at = datetime('now')`);
    p.push(id);
    await query(`UPDATE contractors SET ${sets.join(',')} WHERE id = ?`, p);
    const row = (await query('SELECT * FROM contractors WHERE id=?', [id])).rows[0];
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    const r = (await query('SELECT id,name FROM contractors WHERE id=?', [req.params.id])).rows[0];
    if (!r) return res.status(404).json({ success: false, message: 'Not found' });
    await query('DELETE FROM contractors WHERE id=?', [req.params.id]);
    res.json({ success: true, message: `Contractor "${r.name}" deleted` });
  } catch (err) { next(err); }
};

exports.getStats = async (req, res, next) => {
  try {
    const mineId = req.user.role === 'mine_manager' ? req.user.mine_id : req.query.mine_id;
    const mf = mineId ? `WHERE mine_id = '${mineId}'` : '';
    const [total, byStatus, lowScore] = await Promise.all([
      query(`SELECT COUNT(*) as total, AVG(safety_score) as avg_safety, AVG(compliance_score) as avg_compliance FROM contractors ${mf}`),
      query(`SELECT status, COUNT(*) as count FROM contractors ${mf} GROUP BY status`),
      query(`SELECT c.*, m.name as mine_name FROM contractors c JOIN mines m ON c.mine_id=m.id ${mf ? mf.replace('WHERE','WHERE c.') : 'WHERE c.compliance_score < 60'} ${mf ? 'AND c.compliance_score < 60' : ''} ORDER BY c.compliance_score ASC LIMIT 5`),
    ]);
    res.json({ success: true, data: { totals: total.rows[0], byStatus: byStatus.rows, lowCompliance: lowScore.rows } });
  } catch (err) { next(err); }
};

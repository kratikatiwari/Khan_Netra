const { query } = require('../config/database');

exports.getDashboard = async (req, res, next) => {
  try {
    const isMgr = req.user.role === 'mine_manager' && req.user.mine_id;
    const mineId = req.user.mine_id;

    // Build simple safe filter strings (mine_id is a UUID from our DB, safe to interpolate)
    const mf     = isMgr ? `AND mine_id = '${mineId}'` : '';
    const mfId   = isMgr ? `AND id      = '${mineId}'` : '';
    const mfVMine= isMgr ? `AND v.mine_id = '${mineId}'` : '';
    const mfIMine= isMgr ? `AND i.mine_id = '${mineId}'` : '';
    const mfDMine= isMgr ? `AND d.mine_id = '${mineId}'` : '';
    const mfEMine= isMgr ? `AND e.mine_id = '${mineId}'` : '';
    const mfInsMine= isMgr ? `AND ins.mine_id = '${mineId}'` : '';

    const [mineStats, violStats, incStats, scores,
           recentViol, recentInc, docAlerts, envAlerts, upcoming] = await Promise.all([

      query(`SELECT COUNT(*) as total,
               COUNT(CASE WHEN status='active'           THEN 1 END) as active,
               COUNT(CASE WHEN status='suspended'        THEN 1 END) as suspended,
               COUNT(CASE WHEN status='under_inspection' THEN 1 END) as under_inspection,
               AVG(compliance_score) as avg_compliance,
               AVG(risk_score)       as avg_risk,
               SUM(workers_count)    as total_workers,
               SUM(current_production_mt) as total_production
             FROM mines WHERE 1=1 ${mfId}`),

      query(`SELECT COUNT(*) as total,
               COUNT(CASE WHEN status!='closed' THEN 1 END) as open,
               COUNT(CASE WHEN severity='critical' AND status!='closed' THEN 1 END) as critical,
               COUNT(CASE WHEN severity='high'     AND status!='closed' THEN 1 END) as high,
               SUM(fine_amount) as total_fines
             FROM violations WHERE 1=1 ${mf}`),

      query(`SELECT COUNT(*) as total,
               COUNT(CASE WHEN status!='closed'     THEN 1 END) as open,
               SUM(injuries_count)   as total_injuries,
               SUM(fatalities_count) as total_fatalities,
               COUNT(CASE WHEN severity='fatal'   THEN 1 END) as fatal,
               COUNT(CASE WHEN severity='serious' THEN 1 END) as serious
             FROM incidents WHERE 1=1 ${mf}`),

      query(`SELECT AVG(compliance_score)   as avg_compliance,
                    AVG(risk_score)         as avg_risk,
                    AVG(safety_score)       as avg_safety,
                    AVG(environmental_score)as avg_env
             FROM mines WHERE 1=1 ${mfId}`),

      query(`SELECT v.*, m.name as mine_name
             FROM violations v JOIN mines m ON v.mine_id = m.id
             WHERE v.status != 'closed' ${mfVMine}
             ORDER BY CASE v.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
                      v.detected_date DESC LIMIT 5`),

      query(`SELECT i.*, m.name as mine_name
             FROM incidents i JOIN mines m ON i.mine_id = m.id
             WHERE i.status != 'closed' ${mfIMine}
             ORDER BY CASE i.severity WHEN 'fatal' THEN 1 WHEN 'serious' THEN 2 ELSE 3 END,
                      i.incident_date DESC LIMIT 5`),

      query(`SELECT d.*, m.name as mine_name
             FROM documents d JOIN mines m ON d.mine_id = m.id
             WHERE d.status IN ('expired','expiring_soon') ${mfDMine}
             ORDER BY d.expiry_date ASC LIMIT 5`),

      query(`SELECT DISTINCT ON (e.mine_id, e.parameter) e.*, m.name as mine_name
             FROM environmental_readings e JOIN mines m ON e.mine_id = m.id
             WHERE e.status IN ('warning','critical') ${mfEMine}
             ORDER BY e.mine_id, e.parameter, e.recorded_at DESC LIMIT 5`),

      query(`SELECT ins.*, m.name as mine_name, u.full_name as inspector_name
             FROM inspections ins
             JOIN mines m ON ins.mine_id = m.id
             LEFT JOIN users u ON ins.inspector_id = u.id
             WHERE ins.scheduled_date >= CURRENT_DATE AND ins.status = 'scheduled' ${mfInsMine}
             ORDER BY ins.scheduled_date ASC LIMIT 5`),
    ]);

    res.json({
      success: true,
      data: {
        mines: mineStats.rows[0],
        violations: violStats.rows[0],
        incidents: incStats.rows[0],
        scores: scores.rows[0],
        recent_violations: recentViol.rows,
        recent_incidents: recentInc.rows,
        document_alerts: docAlerts.rows,
        environmental_alerts: envAlerts.rows,
        upcoming_inspections: upcoming.rows,
      }
    });
  } catch (err) { next(err); }
};

exports.getComplianceTrend = async (req, res, next) => {
  try {
    const { mine_id, months = 6 } = req.query;
    const mf = mine_id ? `AND mine_id = '${mine_id}'` : '';
    const result = await query(
      `SELECT DATE_TRUNC('month', detected_date) as month,
         COUNT(*) as violations,
         COUNT(CASE WHEN severity='critical' THEN 1 END) as critical,
         COUNT(CASE WHEN severity='high'     THEN 1 END) as high,
         COUNT(CASE WHEN status='closed'     THEN 1 END) as resolved
       FROM violations
       WHERE detected_date >= NOW() - INTERVAL '${parseInt(months)} months' ${mf}
       GROUP BY month ORDER BY month ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

exports.getMineRanking = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, mine_id, name, state, compliance_score, risk_score, safety_score,
              environmental_score, status,
         (SELECT COUNT(*) FROM violations v WHERE v.mine_id=m.id AND v.status!='closed') as open_violations,
         (SELECT COUNT(*) FROM incidents  i WHERE i.mine_id=m.id AND i.status!='closed') as open_incidents
       FROM mines m ORDER BY compliance_score DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

exports.getViolationAnalytics = async (req, res, next) => {
  try {
    const { mine_id } = req.query;
    const mfW  = mine_id ? `WHERE mine_id = '${mine_id}'` : '';
    const mfA  = mine_id ? `AND mine_id = '${mine_id}'` : '';
    const mfVW = mine_id ? `WHERE v.mine_id = '${mine_id}'` : '';
    const [bySeverity, byType, byMonth, byState] = await Promise.all([
      query(`SELECT severity, COUNT(*) as count, SUM(fine_amount) as fines FROM violations ${mfW} GROUP BY severity`),
      query(`SELECT type, COUNT(*) as count FROM violations ${mfW} GROUP BY type ORDER BY count DESC`),
      query(`SELECT DATE_TRUNC('month', detected_date) as month, COUNT(*) as count
             FROM violations WHERE detected_date >= NOW() - INTERVAL '12 months' ${mfA}
             GROUP BY month ORDER BY month`),
      query(`SELECT m.state, COUNT(*) as count, AVG(m.compliance_score) as avg_compliance
             FROM violations v JOIN mines m ON v.mine_id = m.id ${mfVW}
             GROUP BY m.state ORDER BY count DESC`),
    ]);
    res.json({ success: true, data: { bySeverity: bySeverity.rows, byType: byType.rows, byMonth: byMonth.rows, byState: byState.rows } });
  } catch (err) { next(err); }
};

exports.getProductionAnalytics = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT name, state, type, current_production_mt, production_capacity_mt,
         ROUND((current_production_mt / NULLIF(production_capacity_mt,0))*100, 1) as capacity_utilization,
         workers_count, compliance_score
       FROM mines WHERE status = 'active' ORDER BY current_production_mt DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { mine_id, user_id, action, entity_type, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let conds = [], params = [], pi = 1;
    if (mine_id)     { conds.push(`al.mine_id     = $${pi++}`); params.push(mine_id); }
    if (user_id)     { conds.push(`al.user_id     = $${pi++}`); params.push(user_id); }
    if (action)      { conds.push(`al.action      = $${pi++}`); params.push(action); }
    if (entity_type) { conds.push(`al.entity_type = $${pi++}`); params.push(entity_type); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const total  = (await query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params)).rows[0].count;
    const result = await query(
      `SELECT al.*, u.full_name, u.role, m.name as mine_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id  = u.id
       LEFT JOIN mines m ON al.mine_id  = m.id
       ${where} ORDER BY al.created_at DESC LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: result.rows,
               pagination: { total: parseInt(total), page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
};

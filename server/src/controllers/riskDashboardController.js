'use strict';
const { query } = require('../config/database');

exports.getHighRisk = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    // High-risk mines: sorted by composite risk
    const mines = (await query(
      `SELECT m.*,
         (SELECT COUNT(*) FROM violations v WHERE v.mine_id=m.id AND v.status!='closed' AND v.severity IN ('critical','high')) as critical_violations,
         (SELECT COUNT(*) FROM incidents  i WHERE i.mine_id=m.id AND i.severity IN ('fatal','serious') AND i.incident_date>=datetime('now','-90 days')) as recent_serious_incidents,
         (SELECT COUNT(*) FROM environmental_readings er WHERE er.mine_id=m.id AND er.status IN ('critical','warning') AND er.recorded_at>=datetime('now','-7 days')) as env_alerts,
         (SELECT COUNT(*) FROM documents d WHERE d.mine_id=m.id AND d.status='expired') as expired_docs
       FROM mines m
       WHERE m.status NOT IN ('closed','inactive')
       ORDER BY m.risk_score DESC, critical_violations DESC
       LIMIT ?`,
      [limit]
    )).rows;

    // Recurring violations: same category at same mine 3+ times
    const recurring = (await query(
      `SELECT v.mine_id, m.name as mine_name, v.category, v.type, COUNT(*) as occurrences,
              MAX(v.detected_date) as last_detected
       FROM violations v JOIN mines m ON v.mine_id=m.id
       GROUP BY v.mine_id, v.category, v.type
       HAVING COUNT(*) >= 3
       ORDER BY occurrences DESC
       LIMIT 10`
    )).rows;

    // Anomaly indicators: mines whose risk score jumped by > 20 in 30 days
    // (simplified: mines with risk_score > 70 and multiple recent violations)
    const anomalies = (await query(
      `SELECT m.id, m.name, m.state, m.risk_score,
         COUNT(v.id) as recent_violations,
         SUM(CASE WHEN v.severity='critical' THEN 3 WHEN v.severity='high' THEN 2 ELSE 1 END) as weighted
       FROM mines m
       LEFT JOIN violations v ON v.mine_id=m.id AND v.detected_date >= date('now','-30 days')
       WHERE m.risk_score >= 60
       GROUP BY m.id, m.name, m.state, m.risk_score
       HAVING recent_violations >= 2
       ORDER BY weighted DESC
       LIMIT 8`
    )).rows;

    // Compliance trend: last 6 months
    const complianceTrend = (await query(
      `SELECT strftime('%Y-%m', detected_date) as month,
         COUNT(*) as violations,
         COUNT(CASE WHEN severity='critical' THEN 1 END) as critical
       FROM violations
       WHERE detected_date >= date('now','-6 months')
       GROUP BY month ORDER BY month ASC`
    )).rows;

    // Top violated regulation categories
    const topCategories = (await query(
      `SELECT category, type, COUNT(*) as count, SUM(fine_amount) as total_fines
       FROM violations
       WHERE status != 'closed'
       GROUP BY category, type ORDER BY count DESC LIMIT 8`
    )).rows;

    res.json({
      success: true,
      data: {
        high_risk_mines:   mines,
        recurring_violations: recurring,
        anomaly_mines:     anomalies,
        compliance_trend:  complianceTrend,
        top_categories:    topCategories,
      },
    });
  } catch (err) { next(err); }
};

exports.getRoleBasedDashboard = async (req, res, next) => {
  try {
    const { role } = req.user;
    const mineId  = req.user.mine_id;

    // Mine-officer / mine_manager — their mine only
    if (role === 'mine_manager') {
      const [mine, viol, inc, env, docs, deadlines] = await Promise.all([
        query(`SELECT * FROM mines WHERE id=?`, [mineId]),
        query(`SELECT status, COUNT(*) as c FROM violations WHERE mine_id=? GROUP BY status`, [mineId]),
        query(`SELECT severity, COUNT(*) as c FROM incidents WHERE mine_id=? AND incident_date>=datetime('now','-90 days') GROUP BY severity`, [mineId]),
        query(`SELECT COUNT(*) as alerts FROM environmental_readings WHERE mine_id=? AND status IN ('warning','critical') AND recorded_at>=datetime('now','-7 days')`, [mineId]),
        query(`SELECT COUNT(*) as expired FROM documents WHERE mine_id=? AND status='expired'`, [mineId]),
        query(`SELECT COUNT(*) as overdue FROM compliance_deadlines WHERE mine_id=? AND status='overdue'`, [mineId]),
      ]);
      return res.json({ success: true, role: 'mine_manager', data: {
        mine: mine.rows[0], violations: viol.rows, incidents: inc.rows,
        env_alerts: env.rows[0].alerts, expired_docs: docs.rows[0].expired,
        overdue_deadlines: deadlines.rows[0].overdue,
      }});
    }

    // Inspector — assigned inspections + violations
    if (role === 'inspector') {
      const [upcoming, recent, pendingCA] = await Promise.all([
        query(`SELECT ins.*, m.name as mine_name FROM inspections ins JOIN mines m ON ins.mine_id=m.id WHERE ins.inspector_id=? AND ins.scheduled_date >= date('now') AND ins.status='scheduled' ORDER BY ins.scheduled_date ASC LIMIT 10`, [req.user.id]),
        query(`SELECT ins.*, m.name as mine_name FROM inspections ins JOIN mines m ON ins.mine_id=m.id WHERE ins.inspector_id=? ORDER BY ins.completed_date DESC LIMIT 5`, [req.user.id]),
        query(`SELECT ca.*, v.category, m.name as mine_name FROM corrective_actions ca JOIN violations v ON ca.violation_id=v.id JOIN mines m ON ca.mine_id=m.id WHERE ca.assigned_to=? AND ca.status IN ('pending','in_progress') ORDER BY ca.due_date ASC LIMIT 10`, [req.user.id]),
      ]);
      return res.json({ success: true, role: 'inspector', data: {
        upcoming_inspections: upcoming.rows,
        recent_inspections:   recent.rows,
        pending_actions:      pendingCA.rows,
      }});
    }

    // Government Officer / Admin — national view
    const [mineStats, topRisk, overdueDL, envCritical] = await Promise.all([
      query(`SELECT status, COUNT(*) as count, AVG(compliance_score) as avg_compliance, AVG(risk_score) as avg_risk FROM mines GROUP BY status`),
      query(`SELECT id, name, state, compliance_score, risk_score FROM mines ORDER BY risk_score DESC LIMIT 5`),
      query(`SELECT cd.*, m.name as mine_name FROM compliance_deadlines cd JOIN mines m ON cd.mine_id=m.id WHERE cd.status='overdue' ORDER BY cd.deadline_date ASC LIMIT 5`),
      query(`SELECT DISTINCT er.mine_id, m.name as mine_name, er.parameter, er.value, er.unit, er.status FROM environmental_readings er JOIN mines m ON er.mine_id=m.id WHERE er.status='critical' AND er.recorded_at>=datetime('now','-24 hours') LIMIT 8`),
    ]);
    res.json({ success: true, role, data: {
      mine_stats:        mineStats.rows,
      top_risk_mines:    topRisk.rows,
      overdue_deadlines: overdueDL.rows,
      env_critical:      envCritical.rows,
    }});
  } catch (err) { next(err); }
};

exports.getGisData = async (req, res, next) => {
  try {
    const mineId = req.user.role === 'mine_manager' ? req.user.mine_id : req.query.mine_id;
    const mf = mineId ? `WHERE m.id = '${mineId}'` : '';
    const mfV = mineId ? `WHERE m.id = '${mineId}'` : '';

    // Mines with geo + scores
    const mines = (await query(
      `SELECT m.id, m.name, m.state, m.mine_id, m.type, m.status,
              m.latitude, m.longitude, m.compliance_score, m.risk_score,
              m.license_expiry,
              (SELECT COUNT(*) FROM violations v WHERE v.mine_id=m.id AND v.status!='closed') as open_violations,
              (SELECT COUNT(*) FROM incidents i WHERE i.mine_id=m.id AND i.status!='closed') as open_incidents
       FROM mines m ${mf} WHERE m.latitude IS NOT NULL`
    )).rows;

    // Field reports with geo
    const fieldReports = (await query(
      `SELECT fr.id, fr.report_number, fr.title, fr.report_type, fr.severity,
              fr.latitude, fr.longitude, fr.location_name, fr.status, fr.created_at,
              m.name as mine_name
       FROM field_reports fr JOIN mines m ON fr.mine_id=m.id
       WHERE fr.latitude IS NOT NULL AND fr.status != 'resolved'
       ${mineId ? `AND fr.mine_id = '${mineId}'` : ''}
       ORDER BY fr.created_at DESC LIMIT 50`
    )).rows;

    res.json({
      success: true,
      data: { mines, field_reports: fieldReports },
    });
  } catch (err) { next(err); }
};

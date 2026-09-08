'use strict';
const { query } = require('../config/database');
const { v4: uuid } = require('uuid');
const disasterService = require('../services/disasterService');

/* ── GET /disaster/alerts ──────────────────────────────────────────── */
exports.getAlerts = async (req, res, next) => {
  try {
    const { status, severity, alert_type, page = 1, limit = 30 } = req.query;
    const off = (page - 1) * limit;
    let c = [], p = [];
    if (status)     { c.push('status = ?');     p.push(status); }
    if (severity)   { c.push('severity = ?');   p.push(severity); }
    if (alert_type) { c.push('alert_type = ?'); p.push(alert_type); }
    const w     = c.length ? `WHERE ${c.join(' AND ')}` : '';
    const total = (await query(`SELECT COUNT(*) as n FROM disaster_alerts ${w}`, p)).rows[0].n;
    const rows  = (await query(
      `SELECT * FROM disaster_alerts ${w}
       ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
                alert_time DESC
       LIMIT ? OFFSET ?`,
      [...p, limit, off]
    )).rows.map(r => ({
      ...r,
      affected_mines: tryParse(r.affected_mines, []),
      raw_data:       tryParse(r.raw_data, {}),
    }));
    res.json({ success: true, data: rows, pagination: { total, page: +page, limit: +limit } });
  } catch (err) { next(err); }
};

/* ── GET /disaster/active ──────────────────────────────────────────── */
exports.getActive = async (req, res, next) => {
  try {
    const rows = (await query(
      `SELECT * FROM disaster_alerts
       WHERE status = 'active'
       ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
                alert_time DESC
       LIMIT 50`
    )).rows.map(r => ({
      ...r,
      affected_mines: tryParse(r.affected_mines, []),
      raw_data:       tryParse(r.raw_data, {}),
    }));

    // Stats summary
    const critical = rows.filter(r => r.severity === 'CRITICAL').length;
    const high     = rows.filter(r => r.severity === 'HIGH').length;
    const last_poll= (await query(`SELECT MAX(created_at) as t FROM disaster_alerts WHERE is_test=0`)).rows[0].t;

    res.json({
      success: true,
      data: rows,
      summary: { total: rows.length, critical, high, last_updated: last_poll || null },
    });
  } catch (err) { next(err); }
};

/* ── POST /disaster/acknowledge/:id ────────────────────────────────── */
exports.acknowledge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const row = (await query('SELECT * FROM disaster_alerts WHERE id = ?', [id])).rows[0];
    if (!row) return res.status(404).json({ success: false, message: 'Alert not found' });
    await query(
      `UPDATE disaster_alerts SET status='acknowledged', acknowledged_by=?, acknowledged_at=datetime('now'), updated_at=datetime('now') WHERE id=?`,
      [req.user.id, id]
    );
    await query(
      `INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,description,ip_address) VALUES (?,?,?,?,?,?,?)`,
      [uuid(), req.user.id, 'ACKNOWLEDGE', 'disaster_alert', id, `Acknowledged: ${row.title}`, req.ip]
    );
    const updated = (await query('SELECT * FROM disaster_alerts WHERE id=?', [id])).rows[0];
    res.json({ success: true, data: { ...updated, affected_mines: tryParse(updated.affected_mines, []) } });
  } catch (err) { next(err); }
};

/* ── POST /disaster/resolve/:id ─────────────────────────────────────── */
exports.resolve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;
    const row = (await query('SELECT * FROM disaster_alerts WHERE id = ?', [id])).rows[0];
    if (!row) return res.status(404).json({ success: false, message: 'Alert not found' });
    await query(
      `UPDATE disaster_alerts SET status='resolved', resolved_by=?, resolved_at=datetime('now'), resolution_notes=?, updated_at=datetime('now') WHERE id=?`,
      [req.user.id, resolution_notes || 'Resolved by operator', id]
    );
    await query(
      `INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,description,ip_address) VALUES (?,?,?,?,?,?,?)`,
      [uuid(), req.user.id, 'RESOLVE', 'disaster_alert', id, `Resolved: ${row.title}`, req.ip]
    );
    res.json({ success: true, message: 'Alert resolved' });
  } catch (err) { next(err); }
};

/* ── POST /disaster/test ─────────────────────────────────────────────── */
exports.createTest = async (req, res, next) => {
  try {
    const id = await disasterService.createTestAlert(req.user.id);
    res.status(201).json({ success: true, message: '[TEST] Emergency alert created', alert_id: id });
  } catch (err) { next(err); }
};

/* ── POST /disaster/poll (manual trigger) ──────────────────────────── */
exports.pollNow = async (req, res, next) => {
  try {
    const result = await disasterService.pollAllSources();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

/* ── GET /disaster/history ──────────────────────────────────────────── */
exports.getHistory = async (req, res, next) => {
  try {
    const { days = 7, page = 1, limit = 50 } = req.query;
    const off  = (page - 1) * limit;
    const total = (await query(
      `SELECT COUNT(*) as n FROM disaster_alerts WHERE alert_time >= datetime('now','-${parseInt(days)} days')`
    )).rows[0].n;
    const rows = (await query(
      `SELECT da.*,
              u1.full_name as acknowledged_by_name,
              u2.full_name as resolved_by_name
       FROM disaster_alerts da
       LEFT JOIN users u1 ON da.acknowledged_by = u1.id
       LEFT JOIN users u2 ON da.resolved_by     = u2.id
       WHERE da.alert_time >= datetime('now','-${parseInt(days)} days')
       ORDER BY da.alert_time DESC
       LIMIT ? OFFSET ?`,
      [limit, off]
    )).rows.map(r => ({ ...r, affected_mines: tryParse(r.affected_mines, []) }));
    res.json({ success: true, data: rows, pagination: { total, page: +page, limit: +limit } });
  } catch (err) { next(err); }
};

/* ── GET /disaster/stats ──────────────────────────────────────────────── */
exports.getStats = async (req, res, next) => {
  try {
    const [bySeverity, byType, byStatus, trend] = await Promise.all([
      query(`SELECT severity, COUNT(*) as count FROM disaster_alerts WHERE is_test=0 GROUP BY severity`),
      query(`SELECT alert_type, COUNT(*) as count FROM disaster_alerts WHERE is_test=0 GROUP BY alert_type ORDER BY count DESC LIMIT 8`),
      query(`SELECT status, COUNT(*) as count FROM disaster_alerts WHERE is_test=0 GROUP BY status`),
      query(`SELECT strftime('%Y-%m-%d',alert_time) as day, COUNT(*) as count FROM disaster_alerts WHERE alert_time >= datetime('now','-30 days') AND is_test=0 GROUP BY day ORDER BY day`),
    ]);
    res.json({
      success: true,
      data: {
        by_severity: bySeverity.rows,
        by_type:     byType.rows,
        by_status:   byStatus.rows,
        trend:       trend.rows,
      },
    });
  } catch (err) { next(err); }
};

/* ── helper ─────────────────────────────────────────────────────────── */
function tryParse(str, fallback) {
  try { return str ? JSON.parse(str) : fallback; }
  catch { return fallback; }
}

const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

exports.getAll = async (req, res, next) => {
  try {
    const { is_read, type, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let conds = [`n.user_id = $1`], params = [req.user.id];
    let pi = 2;
    if (is_read !== undefined) { conds.push(`n.is_read = ?`); params.push(is_read === 'true' ? 1 : 0); }
    if (type) { conds.push(`n.type = $${pi++}`); params.push(type); }
    if (priority) { conds.push(`n.priority = $${pi++}`); params.push(priority); }
    const where = `WHERE ${conds.join(' AND ')}`;
    const total = (await query(`SELECT COUNT(*) FROM notifications n ${where}`, params)).rows[0].count;
    const unread = (await query(`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`, [req.user.id])).rows[0].count;
    const result = await query(
      `SELECT n.*, m.name as mine_name FROM notifications n LEFT JOIN mines m ON n.mine_id = m.id
       ${where} ORDER BY n.created_at DESC LIMIT $${pi++} OFFSET $${pi++}`,
      [...params, limit, offset]
    );
    res.json({ success: true, data: result.rows, unread_count: parseInt(unread), pagination: { total: parseInt(total), page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
  try {
    await query(`DELETE FROM notifications WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) { next(err); }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    res.json({ success: true, data: { count: parseInt(result.rows[0].count) } });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { user_id, mine_id, title, message, type, priority, action_url } = req.body;
    const result = await query(
      `INSERT INTO notifications (id, user_id, mine_id, title, message, type, priority, action_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuidv4(), user_id, mine_id, title, message, type || 'info', priority || 'medium', action_url]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

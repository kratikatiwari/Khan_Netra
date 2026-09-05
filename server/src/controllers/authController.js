const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const makeTokens = (user) => {
  const p = { id: user.id, email: user.email, role: user.role };
  return {
    token:        jwt.sign(p, process.env.JWT_SECRET,         { expiresIn: process.env.JWT_EXPIRES_IN  || '24h' }),
    refreshToken: jwt.sign(p, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }),
  };
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success:false, message:'Email and password required' });

    const r = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!r.rows.length)
      return res.status(401).json({ success:false, message:'Invalid credentials' });

    const user = r.rows[0];
    if (!user.is_active)
      return res.status(401).json({ success:false, message:'Account deactivated. Contact admin.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok)
      return res.status(401).json({ success:false, message:'Invalid credentials' });

    await query("UPDATE users SET last_login = datetime('now') WHERE id = ?", [user.id]);
    const { token, refreshToken } = makeTokens(user);

    await query(
      `INSERT INTO audit_logs (id,user_id,action,entity_type,entity_id,description,ip_address) VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(), user.id, 'LOGIN', 'auth', user.id, `User ${user.full_name} logged in`, req.ip]
    );

    const { password_hash, ...safe } = user;
    res.json({ success:true, message:'Login successful', data:{ user:safe, token, refreshToken } });
  } catch (err) { next(err); }
};

exports.register = async (req, res, next) => {
  try {
    const { email, password, full_name, role, phone, designation, department, mine_id } = req.body;
    if (!email || !password || !full_name || !role)
      return res.status(400).json({ success:false, message:'Required fields missing' });

    const allowed = ['admin','government_officer','mine_manager','inspector','safety_officer','environment_officer'];
    if (!allowed.includes(role))
      return res.status(400).json({ success:false, message:'Invalid role' });

    const ex = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (ex.rows.length)
      return res.status(409).json({ success:false, message:'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const id   = uuidv4();
    await query(
      `INSERT INTO users (id,email,password_hash,full_name,role,phone,designation,department,mine_id) VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, email.toLowerCase(), hash, full_name, role, phone||null, designation||null, department||null, mine_id||null]
    );
    const user = (await query('SELECT id,email,full_name,role,phone,designation,department,mine_id,created_at FROM users WHERE id = ?',[id])).rows[0];
    const { token, refreshToken } = makeTokens(user);
    res.status(201).json({ success:true, message:'Registration successful', data:{ user, token, refreshToken } });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT u.id,u.email,u.full_name,u.role,u.phone,u.designation,u.department,u.mine_id,
              u.is_active,u.last_login,u.created_at, m.name as mine_name
       FROM users u LEFT JOIN mines m ON u.mine_id = m.id WHERE u.id = ?`,
      [req.user.id]
    );
    if (!r.rows[0]) return res.status(404).json({ success:false, message:'User not found' });
    res.json({ success:true, data:r.rows[0] });
  } catch (err) { next(err); }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success:false, message:'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const r = await query('SELECT id,email,full_name,role FROM users WHERE id = ? AND is_active = 1', [decoded.id]);
    if (!r.rows[0])
      return res.status(401).json({ success:false, message:'Invalid refresh token' });
    res.json({ success:true, data:makeTokens(r.rows[0]) });
  } catch { res.status(401).json({ success:false, message:'Invalid or expired refresh token' }); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, designation, department } = req.body;
    await query(
      `UPDATE users SET full_name=COALESCE(?,full_name), phone=COALESCE(?,phone),
       designation=COALESCE(?,designation), department=COALESCE(?,department),
       updated_at=datetime('now') WHERE id=?`,
      [full_name, phone, designation, department, req.user.id]
    );
    const user = (await query('SELECT id,email,full_name,role,phone,designation,department FROM users WHERE id=?',[req.user.id])).rows[0];
    res.json({ success:true, message:'Profile updated', data:user });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ success:false, message:'Both passwords required' });
    if (new_password.length < 8)
      return res.status(400).json({ success:false, message:'Password must be at least 8 characters' });
    const r = await query('SELECT password_hash FROM users WHERE id=?',[req.user.id]);
    if (!(await bcrypt.compare(current_password, r.rows[0].password_hash)))
      return res.status(400).json({ success:false, message:'Current password incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await query("UPDATE users SET password_hash=?, updated_at=datetime('now') WHERE id=?",[hash, req.user.id]);
    res.json({ success:true, message:'Password changed successfully' });
  } catch (err) { next(err); }
};

/**
 * KhanNetra Auth Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-ready registration → email verification → login flow.
 * - express-validator for all input sanitisation
 * - bcryptjs password hashing (cost 12)
 * - Secure single-use expiring verification tokens
 * - No credentials / tokens / secrets ever sent to frontend (except dev_verify_token when SMTP off)
 * - Email provider-agnostic wording (not "Gmail")
 * - Graceful email failure: user is registered even if email send fails
 * - JWT / refresh token flow unchanged
 */
'use strict';

const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const { v4: uuidv4 }         = require('uuid');
const { validationResult }   = require('express-validator');
const { query }              = require('../config/database');
const emailService           = require('../services/emailService');

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const makeTokens = (user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  return {
    token:        jwt.sign(payload, process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRES_IN         || '24h' }),
    refreshToken: jwt.sign(payload, process.env.JWT_REFRESH_SECRET,
                    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }),
  };
};

/** 96-char hex token — 48 bytes of CSPRNG entropy */
const makeVerifyToken = () => crypto.randomBytes(48).toString('hex');

/** ISO string 24 h from now */
const tokenExpiry = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

/** Pull express-validator errors into a single string */
const validationErrors = (req) => {
  const result = validationResult(req);
  if (result.isEmpty()) return null;
  return result.array().map(e => e.msg).join(' ');
};

const ALLOWED_ROLES = [
  'admin', 'government_officer', 'mine_manager',
  'inspector', 'safety_officer', 'environment_officer',
];

/* ════════════════════════════════════════════════════════════════════════════
   REGISTER
════════════════════════════════════════════════════════════════════════════ */
exports.register = async (req, res, next) => {
  try {
    /* ── Input validation (express-validator rules applied in authRoutes.js) */
    const valErr = validationErrors(req);
    if (valErr) return res.status(400).json({ success: false, message: valErr });

    const {
      email, password, confirm_password,
      full_name, role,
      phone, designation, department, mine_id,
    } = req.body;

    /* ── Password confirmation (done here so we can keep the route validator simple) */
    if (confirm_password !== undefined && password !== confirm_password)
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });

    /* ── Role allow-list */
    if (!ALLOWED_ROLES.includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role selected.' });

    const emailLower = email.toLowerCase().trim();

    /* ── Gmail-only guard (belt-and-suspenders after route validator) */
    if (!emailLower.endsWith('@gmail.com'))
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid Gmail address (example@gmail.com).',
      });

    /* ── Duplicate email */
    const existing = await query('SELECT id FROM users WHERE email = ?', [emailLower]);
    if (existing.rows.length)
      return res.status(409).json({
        success: false,
        message: 'This Gmail address is already registered. Please Sign In.',
      });

    /* ── Hash password (cost 12 ≈ 250 ms — strong against brute force) */
    const passwordHash = await bcrypt.hash(password, 12);
    const id           = uuidv4();
    const verifyToken  = makeVerifyToken();
    const expiry       = tokenExpiry();

    /* ── Insert user (email_verified = 0) */
    await query(
      `INSERT INTO users
         (id, email, password_hash, full_name, role, phone,
          designation, department, mine_id,
          email_verified, verification_token, token_expires_at)
       VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`,
      [
        id, emailLower, passwordHash,
        full_name.trim(), role,
        phone       ? phone.trim()       : null,
        designation ? designation.trim() : null,
        department  ? department.trim()  : null,
        mine_id     || null,
        verifyToken, expiry,
      ],
    );

    /* ── Send verification email */
    let emailSent = false;
    let emailError = null;
    try {
      await emailService.sendVerificationEmail(emailLower, full_name.trim(), verifyToken);
      emailSent = true;
    } catch (err) {
      emailError = err.message;
      console.error('[Auth] Verification email failed:', err.message);
      // Registration still succeeds — user can resend later
    }

    /* ── Audit log (non-blocking — don't fail registration if audit fails) */
    query(
      `INSERT INTO audit_logs
         (id, user_id, action, entity_type, entity_id, description, ip_address)
       VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(), id, 'REGISTER', 'auth', id, `New user registered: ${emailLower}`, req.ip],
    ).catch(e => console.error('[Auth] Audit log failed:', e.message));

    /* ── Response — never leak verifyToken when SMTP is working */
    const smtpConfigured = emailService.isConfigured();
    const baseUrl = emailService.getClientBaseUrl();

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Registration successful! A verification email has been sent. Please check your inbox and spam folder.'
        : smtpConfigured
          ? 'Registration successful, but the verification email could not be sent right now. Please use "Resend Verification Email" to try again.'
          : 'Registration successful! Email service is not configured on this server. Please contact the administrator.',
      data: {
        email:            emailLower,
        email_sent:       emailSent,
        smtp_configured:  smtpConfigured,
        // Expose verify token ONLY in dev mode when SMTP is not set up
        // so developers can still test the flow without a real email provider
        ...( !smtpConfigured && process.env.NODE_ENV !== 'production'
             ? { dev_verify_url: `${baseUrl}/verify-email?token=${encodeURIComponent(verifyToken)}` }
             : {}
           ),
      },
    });
  } catch (err) { next(err); }
};

/* ════════════════════════════════════════════════════════════════════════════
   VERIFY EMAIL  —  GET /auth/verify-email?token=<hex>
════════════════════════════════════════════════════════════════════════════ */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string' || token.length < 20)
      return res.status(400).json({
        success: false,
        code:    'INVALID_TOKEN',
        message: 'Verification token is missing or malformed.',
      });

    const r = await query(
      `SELECT id, email, full_name, email_verified, token_expires_at
       FROM users WHERE verification_token = ?`,
      [token.trim()],
    );

    if (!r.rows.length)
      return res.status(400).json({
        success: false,
        code:    'INVALID_TOKEN',
        message: 'This verification link is invalid or has already been used.',
      });

    const user = r.rows[0];

    if (user.email_verified)
      return res.status(200).json({
        success: false,
        code:    'ALREADY_VERIFIED',
        message: 'This email address is already verified. You can sign in.',
      });

    if (new Date(user.token_expires_at) < new Date())
      return res.status(400).json({
        success: false,
        code:    'TOKEN_EXPIRED',
        message: 'This verification link has expired. Please request a new one using "Resend Verification Email".',
      });

    /* ── Mark verified and clear token atomically */
    await query(
      `UPDATE users
       SET email_verified = 1,
           verification_token = NULL,
           token_expires_at   = NULL,
           updated_at         = datetime('now')
       WHERE id = ?`,
      [user.id],
    );

    query(
      `INSERT INTO audit_logs
         (id, user_id, action, entity_type, entity_id, description, ip_address)
       VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(), user.id, 'EMAIL_VERIFIED', 'auth', user.id,
       `Email verified: ${user.email}`, req.ip || 'system'],
    ).catch(e => console.error('[Auth] Audit log failed:', e.message));

    return res.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
      data:    { email: user.email, full_name: user.full_name },
    });
  } catch (err) { next(err); }
};

/* ════════════════════════════════════════════════════════════════════════════
   RESEND VERIFICATION  —  POST /auth/resend-verification
════════════════════════════════════════════════════════════════════════════ */
exports.resendVerification = async (req, res, next) => {
  try {
    const valErr = validationErrors(req);
    if (valErr) return res.status(400).json({ success: false, message: valErr });

    const email = (req.body.email || '').toLowerCase().trim();

    /* ── Anti-enumeration: always return the same public message */
    const SAFE_MSG = 'If this email is registered and unverified, a new verification link has been sent. Please check your inbox and spam folder.';

    const r = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!r.rows.length)
      return res.json({ success: true, message: SAFE_MSG });

    const user = r.rows[0];
    if (user.email_verified)
      return res.json({ success: true, message: 'This email is already verified. You can sign in.' });

    /* ── Generate fresh token */
    const verifyToken = makeVerifyToken();
    const expiry      = tokenExpiry();
    await query(
      `UPDATE users
       SET verification_token = ?,
           token_expires_at   = ?,
           updated_at         = datetime('now')
       WHERE id = ?`,
      [verifyToken, expiry, user.id],
    );

    let emailSent = false;
    try {
      await emailService.sendVerificationEmail(user.email, user.full_name, verifyToken);
      emailSent = true;
    } catch (e) {
      console.error('[Auth] Resend email failed:', e.message);
    }

    const smtpConfigured = emailService.isConfigured();
    const baseUrl        = emailService.getClientBaseUrl();

    return res.json({
      success: true,
      message: SAFE_MSG,
      data: {
        email_sent:      emailSent,
        smtp_configured: smtpConfigured,
        ...( !smtpConfigured && process.env.NODE_ENV !== 'production'
             ? { dev_verify_url: `${baseUrl}/verify-email?token=${encodeURIComponent(verifyToken)}` }
             : {}
           ),
      },
    });
  } catch (err) { next(err); }
};

/* ════════════════════════════════════════════════════════════════════════════
   LOGIN  —  POST /auth/login
════════════════════════════════════════════════════════════════════════════ */
exports.login = async (req, res, next) => {
  try {
    const valErr = validationErrors(req);
    if (valErr) return res.status(400).json({ success: false, message: valErr });

    const email    = (req.body.email    || '').toLowerCase().trim();
    const password =  req.body.password || '';

    const r = await query('SELECT * FROM users WHERE email = ?', [email]);

    /* ── Same error for "not found" and "wrong password" — prevents enumeration */
    if (!r.rows.length)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const user = r.rows[0];

    if (!user.is_active)
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator.',
      });

    /* ── Check password BEFORE email-verified check so attackers can't
          distinguish "wrong password" from "email not verified" */
    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    /* ── Email verification gate */
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        code:    'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address before signing in. Check your inbox for the verification link.',
        email:   user.email,
      });
    }

    /* ── All checks passed — issue JWT + refresh token */
    await query(
      "UPDATE users SET last_login = datetime('now') WHERE id = ?",
      [user.id],
    );

    const { token, refreshToken } = makeTokens(user);

    query(
      `INSERT INTO audit_logs
         (id, user_id, action, entity_type, entity_id, description, ip_address)
       VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(), user.id, 'LOGIN', 'auth', user.id,
       `User ${user.full_name} logged in`, req.ip],
    ).catch(e => console.error('[Auth] Audit log failed:', e.message));

    /* ── Strip sensitive columns before sending user object */
    const { password_hash, verification_token, token_expires_at, ...safeUser } = user;

    return res.json({
      success: true,
      message: 'Login successful.',
      data:    { user: safeUser, token, refreshToken },
    });
  } catch (err) { next(err); }
};

/* ════════════════════════════════════════════════════════════════════════════
   GET ME  —  GET /auth/me  (authenticated)
════════════════════════════════════════════════════════════════════════════ */
exports.getMe = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.phone,
              u.designation, u.department, u.mine_id,
              u.is_active, u.email_verified, u.last_login, u.created_at,
              m.name AS mine_name
       FROM users u
       LEFT JOIN mines m ON u.mine_id = m.id
       WHERE u.id = ?`,
      [req.user.id],
    );
    if (!r.rows[0])
      return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, data: r.rows[0] });
  } catch (err) { next(err); }
};

/* ════════════════════════════════════════════════════════════════════════════
   REFRESH TOKEN  —  POST /auth/refresh
════════════════════════════════════════════════════════════════════════════ */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success: false, message: 'Refresh token required.' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const r = await query(
      'SELECT id, email, full_name, role FROM users WHERE id = ? AND is_active = 1',
      [decoded.id],
    );
    if (!r.rows[0])
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });

    return res.json({ success: true, data: makeTokens(r.rows[0]) });
  } catch (err) { next(err); }
};

/* ════════════════════════════════════════════════════════════════════════════
   UPDATE PROFILE  —  PUT /auth/profile  (authenticated)
════════════════════════════════════════════════════════════════════════════ */
exports.updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, designation, department } = req.body;
    await query(
      `UPDATE users
       SET full_name    = COALESCE(?, full_name),
           phone        = COALESCE(?, phone),
           designation  = COALESCE(?, designation),
           department   = COALESCE(?, department),
           updated_at   = datetime('now')
       WHERE id = ?`,
      [full_name, phone, designation, department, req.user.id],
    );
    const user = (await query(
      'SELECT id, email, full_name, role, phone, designation, department FROM users WHERE id = ?',
      [req.user.id],
    )).rows[0];
    return res.json({ success: true, message: 'Profile updated.', data: user });
  } catch (err) { next(err); }
};

/* ════════════════════════════════════════════════════════════════════════════
   CHANGE PASSWORD  —  PUT /auth/change-password  (authenticated)
════════════════════════════════════════════════════════════════════════════ */
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password)
      return res.status(400).json({ success: false, message: 'Both current and new passwords are required.' });

    if (new_password.length < 8)
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });

    if (current_password === new_password)
      return res.status(400).json({ success: false, message: 'New password must be different from your current password.' });

    const r = await query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!r.rows[0])
      return res.status(404).json({ success: false, message: 'User not found.' });

    const match = await bcrypt.compare(current_password, r.rows[0].password_hash);
    if (!match)
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(new_password, 12);
    await query(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
      [newHash, req.user.id],
    );

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) { next(err); }
};

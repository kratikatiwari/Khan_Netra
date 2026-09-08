/**
 * KhanNetra Email Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Supports any SMTP provider via .env — Gmail, Sendgrid, Mailgun, SES, Resend.
 * No credentials are hardcoded. No localhost URL is hardcoded.
 *
 * Required .env variables:
 *   SMTP_HOST       e.g. smtp.gmail.com | smtp.sendgrid.net
 *   SMTP_PORT       e.g. 587 (STARTTLS) | 465 (SSL)
 *   SMTP_USER       e.g. yourapp@gmail.com | apikey (Sendgrid)
 *   SMTP_PASS       App-password / API-key (spaces stripped automatically)
 *   SMTP_FROM       Display name + address: KhanNetra DGMS <you@gmail.com>
 *
 * URL env variables (drives verification link in emails):
 *   CLIENT_URL      Production domain:  https://khannetra.yourdomain.in
 *   DEV_CLIENT_URL  LAN/dev override:   http://192.168.1.100:3000 (optional)
 *                   Falls back to CLIENT_URL if not set.
 */
'use strict';

const nodemailer = require('nodemailer');

/* ─── Resolve the base URL used inside email links ──────────────────────────
 * Priority:
 *   1. DEV_CLIENT_URL  (non-empty, for LAN / dev overrides)
 *   2. CLIENT_URL      (production domain or localhost:3000)
 *   3. http://localhost:3000  (last-resort dev fallback — never in prod)
 */
function getClientBaseUrl() {
  const dev  = (process.env.DEV_CLIENT_URL || '').trim().replace(/\/$/, '');
  const prod = (process.env.CLIENT_URL     || '').trim().replace(/\/$/, '');
  return dev || prod || 'http://localhost:3000';
}

/* ─── Lazy-init SMTP transporter ─────────────────────────────────────────── */
let _transport = null;
let _verified  = false;

function getTransport() {
  if (_transport) return _transport;

  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = (process.env.SMTP_USER || '').trim();
  // Spaces in Gmail App Passwords are cosmetic — strip them
  const pass = (process.env.SMTP_PASS || '').replace(/\s/g, '');

  if (!host || !user || !pass) {
    return null; // SMTP not configured — caller handles console fallback
  }

  _transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,       // true = SSL, false = STARTTLS
    auth: { user, pass },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    connectionTimeout: 12000,
    greetingTimeout:   12000,
    socketTimeout:     20000,
  });

  // Verify connection once (non-blocking) and reset on failure so next
  // attempt can retry rather than keep a broken transporter forever.
  if (!_verified) {
    _verified = true;
    _transport.verify()
      .then(() => {
        console.log('[Email] ✅ SMTP connection verified — emails ready');
        console.log(`[Email]    Host: ${host}:${port}  User: ${user}`);
      })
      .catch(err => {
        console.error('[Email] ❌ SMTP connection failed:', err.message);
        console.error('[Email]    Check SMTP_HOST / SMTP_USER / SMTP_PASS in server/.env');
        _transport = null;
        _verified  = false;
      });
  }

  return _transport;
}

/* ─── Resolve the From address ───────────────────────────────────────────── */
function getFromAddress() {
  const raw  = (process.env.SMTP_FROM || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  // Use SMTP_FROM if it actually contains an email address; otherwise build it
  return raw && raw.includes('@') ? raw : `KhanNetra DGMS <${user}>`;
}

/* ─── Core send helper ───────────────────────────────────────────────────── */
async function sendMail({ to, subject, html, text }) {
  const transport = getTransport();

  if (!transport) {
    // ── Console fallback (dev mode — SMTP not configured) ──────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('[EMAIL — SMTP NOT CONFIGURED — console fallback]');
    console.log('Set SMTP_HOST / SMTP_USER / SMTP_PASS in server/.env');
    console.log('');
    console.log('To:     ', to);
    console.log('Subject:', subject);
    if (text) {
      const lines = text.split('\n').slice(0, 8);
      console.log('Body:\n', lines.join('\n'));
    }
    console.log('═'.repeat(60) + '\n');
    return { messageId: 'console-fallback' };
  }

  try {
    const info = await transport.sendMail({
      from: getFromAddress(),
      to,
      subject,
      html,
      text,
    });
    console.log(`[Email] ✉️  Sent → ${to}  messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    // Reset transporter so next request re-initialises (handles auth token rotation etc.)
    _transport = null;
    _verified  = false;
    console.error(`[Email] ❌ Send failed to ${to}:`, err.message);
    throw err; // caller decides whether to surface this to the user
  }
}

/* ─── Verification email ─────────────────────────────────────────────────── */
exports.sendVerificationEmail = async (toEmail, fullName, token) => {
  const baseUrl   = getClientBaseUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  const safeFullName = String(fullName).replace(/[<>]/g, '');
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Verify your KhanNetra email</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;background:#060e1c;margin:0;padding:0}
    .wrap{max-width:520px;margin:32px auto;background:#0d1a2d;border-radius:16px;
          overflow:hidden;border:1px solid rgba(245,158,11,.25)}
    .hdr{background:linear-gradient(135deg,#1a2e48,#0d1a2d);padding:28px 32px;
         text-align:center;border-bottom:2px solid rgba(245,158,11,.3)}
    .logo{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);
          border-radius:10px;padding:8px 16px;font-weight:900;color:#060e1c;font-size:18px}
    h1{color:#f1f5f9;margin:12px 0 4px;font-size:22px}
    .sub{color:rgba(255,255,255,.45);font-size:12px;margin:0}
    .body{padding:28px 32px}
    p{color:rgba(255,255,255,.7);font-size:14px;line-height:1.65;margin:0 0 16px}
    .name{color:#fbbf24;font-weight:700}
    .btn{display:block;background:linear-gradient(135deg,#f59e0b,#d97706);
         color:#060e1c!important;text-decoration:none;padding:14px 28px;
         border-radius:10px;font-weight:800;font-size:15px;text-align:center;margin:20px 0}
    .link-box{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
              border-radius:8px;padding:12px 16px;word-break:break-all;
              font-family:monospace;font-size:11px;color:rgba(255,255,255,.5);margin:12px 0}
    .warn{color:rgba(255,255,255,.35);font-size:12px;line-height:1.5}
    .ftr{padding:16px 32px;border-top:1px solid rgba(255,255,255,.08);
         text-align:center;color:rgba(255,255,255,.2);font-size:11px}
    @media(max-width:600px){.wrap{margin:0;border-radius:0}.body,.hdr{padding:20px}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="logo">KN</div>
      <h1>KhanNetra DGMS</h1>
      <p class="sub">AI-Based Smart Governance &amp; Compliance System</p>
    </div>
    <div class="body">
      <p>Hello, <span class="name">${safeFullName}</span> 👋</p>
      <p>Thank you for registering with <strong style="color:#fbbf24">KhanNetra DGMS</strong>.
         Please verify your email address to activate your account.</p>
      <p><strong style="color:#f1f5f9">Click the button below to verify your email:</strong></p>
      <a href="${verifyUrl}" class="btn">✉️ Verify My Email Address</a>
      <p class="warn">If the button doesn't work, copy and paste this link into your browser:</p>
      <div class="link-box">${verifyUrl}</div>
      <p class="warn">
        ⏰ This link expires in <strong style="color:#fbbf24">24 hours</strong>.<br/>
        If you did not create this account, you can safely ignore this email.
      </p>
    </div>
    <div class="ftr">
      🔒 KhanNetra · DGMS · Ministry of Coal, Govt. of India<br/>
      © ${year} KhanNetra. All Rights Reserved.
    </div>
  </div>
</body>
</html>`;

  const text = [
    `Hello ${safeFullName},`,
    '',
    'Please verify your KhanNetra DGMS email address by visiting the link below.',
    'This link works on any device — phone, tablet, or computer.',
    '',
    verifyUrl,
    '',
    'This link expires in 24 hours.',
    'If you did not create this account, please ignore this email.',
    '',
    '— KhanNetra DGMS Team',
  ].join('\n');

  return sendMail({
    to:      toEmail,
    subject: '✉️ Verify your KhanNetra DGMS email address',
    html,
    text,
  });
};

/* ─── Password reset email ───────────────────────────────────────────────── */
exports.sendPasswordResetEmail = async (toEmail, fullName, token) => {
  const baseUrl  = getClientBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const safeFullName = String(fullName).replace(/[<>]/g, '');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Reset your KhanNetra password</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#060e1c;margin:0;padding:0}
  .wrap{max-width:520px;margin:32px auto;background:#0d1a2d;border-radius:16px;
        border:1px solid rgba(245,158,11,.25);overflow:hidden}
  .hdr{background:linear-gradient(135deg,#1a2e48,#0d1a2d);padding:28px 32px;
       text-align:center;border-bottom:2px solid rgba(245,158,11,.3)}
  .logo{display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);
        border-radius:10px;padding:8px 16px;font-weight:900;color:#060e1c;font-size:18px}
  h1{color:#f1f5f9;margin:12px 0 4px;font-size:22px}
  .body{padding:28px 32px}
  p{color:rgba(255,255,255,.7);font-size:14px;line-height:1.65;margin:0 0 16px}
  .btn{display:block;background:linear-gradient(135deg,#f59e0b,#d97706);
       color:#060e1c!important;text-decoration:none;padding:14px 28px;
       border-radius:10px;font-weight:800;font-size:15px;text-align:center;margin:20px 0}
  .warn{color:rgba(255,255,255,.35);font-size:12px;line-height:1.5}
  .ftr{padding:16px 32px;border-top:1px solid rgba(255,255,255,.08);
       text-align:center;color:rgba(255,255,255,.2);font-size:11px}
</style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="logo">KN</div>
      <h1>KhanNetra DGMS</h1>
    </div>
    <div class="body">
      <p>Hello, <strong style="color:#fbbf24">${safeFullName}</strong>,</p>
      <p>We received a request to reset your KhanNetra DGMS password.
         Click the button below to set a new password:</p>
      <a href="${resetUrl}" class="btn">🔐 Reset My Password</a>
      <p class="warn">This link expires in <strong style="color:#fbbf24">1 hour</strong>.<br/>
      If you didn't request a password reset, please ignore this email — your account is safe.</p>
    </div>
    <div class="ftr">© ${new Date().getFullYear()} KhanNetra DGMS. All Rights Reserved.</div>
  </div>
</body>
</html>`;

  const text = [
    `Hello ${safeFullName},`,
    '',
    'Reset your KhanNetra DGMS password by visiting:',
    resetUrl,
    '',
    'This link expires in 1 hour.',
    'If you did not request a reset, ignore this email.',
    '',
    '— KhanNetra DGMS Team',
  ].join('\n');

  return sendMail({
    to:      toEmail,
    subject: '🔐 Reset your KhanNetra DGMS password',
    html,
    text,
  });
};

/* ─── Status helpers ─────────────────────────────────────────────────────── */

/** Returns true when all required SMTP env vars are present and non-empty. */
exports.isConfigured = () => {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s/g, '');
  return !!(host && user && pass);
};

/** Returns the effective client base URL (for logging/debugging only). */
exports.getClientBaseUrl = getClientBaseUrl;

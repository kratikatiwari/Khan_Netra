/**
 * KhanNetra Auth Routes
 * ─────────────────────────────────────────────────────────────────────────────
 * - Gmail-only email validation on register + resend
 * - Dev-mode rate limiters are very generous (1000 req/15 min) so local
 *   testing is never blocked; production uses tighter defaults from .env
 * - express-validator rules sanitise all inputs before the controller runs
 */
'use strict';

const express   = require('express');
const rateLimit = require('express-rate-limit');
const { body }  = require('express-validator');
const router    = express.Router();
const ctrl      = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const isDev = (process.env.NODE_ENV || 'development') === 'development';

/* ── Rate limiter factory ─────────────────────────────────────────────────
 * In development the window is the same but the cap is set to 1000 so
 * normal testing (many registrations from localhost) is never blocked.
 * In production the .env values (or sensible defaults) apply.
 */
const makeLimit = (envKey, prodDefault, message) => {
  const max = isDev
    ? 1000
    : (parseInt(process.env[envKey], 10) || prodDefault);

  return rateLimit({
    windowMs:        15 * 60 * 1000,   // 15-minute window
    max,
    standardHeaders: true,
    legacyHeaders:   false,
    skipSuccessfulRequests: false,
    message: {
      success: false,
      message,
      retryAfter: '15 minutes',
    },
    keyGenerator: (req) =>
      req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip,
  });
};

const registerLimiter = makeLimit(
  'REGISTER_RATE_LIMIT', 10,
  'Too many registration attempts. Please wait 15 minutes and try again.',
);
const resendLimiter = makeLimit(
  'RESEND_RATE_LIMIT', 5,
  'Too many resend requests. Please wait 15 minutes and try again.',
);
const loginLimiter = makeLimit(
  'LOGIN_RATE_LIMIT', 20,
  'Too many login attempts. Please wait 15 minutes and try again.',
);

/* ── Gmail validator helper ───────────────────────────────────────────────
 * Accepts only addresses that end with @gmail.com (case-insensitive).
 * Trims spaces before checking.
 */
const gmailRegex = /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i;

const isGmail = (value) => {
  const trimmed = (value || '').trim();
  if (!gmailRegex.test(trimmed)) {
    throw new Error('Please enter a valid Gmail address (example@gmail.com).');
  }
  return true;
};

/* ── Validator rule sets ──────────────────────────────────────────────────*/

const registerRules = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters.')
    .escape(),

  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .custom(isGmail)
    .customSanitizer(v => v.toLowerCase().trim()),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .isLength({ max: 128 }).withMessage('Password must not exceed 128 characters.'),

  body('confirm_password')
    .optional()
    .isLength({ max: 128 }),

  body('role')
    .trim()
    .notEmpty().withMessage('Role is required.')
    .isIn([
      'admin', 'government_officer', 'mine_manager',
      'inspector', 'safety_officer', 'environment_officer',
    ]).withMessage('Invalid role selected.'),

  // Optional fields — sanitise only
  body('phone').optional({ checkFalsy: true }).trim().escape(),
  body('designation').optional({ checkFalsy: true }).trim().escape(),
  body('department').optional({ checkFalsy: true }).trim().escape(),
  body('mine_id').optional({ checkFalsy: true }).trim(),
];

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    // Login accepts any email format (not just Gmail) so existing demo accounts work
    .isEmail().withMessage('Please enter a valid email address.')
    .customSanitizer(v => v.toLowerCase().trim()),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ max: 128 }).withMessage('Invalid credentials.'),
];

const resendRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .custom(isGmail)
    .customSanitizer(v => v.toLowerCase().trim()),
];

/* ── Routes ───────────────────────────────────────────────────────────────*/

// Public
router.post('/register',            registerLimiter, registerRules, ctrl.register);
router.post('/login',               loginLimiter,    loginRules,    ctrl.login);
router.post('/refresh',             ctrl.refreshToken);
router.get ('/verify-email',        ctrl.verifyEmail);
router.post('/resend-verification', resendLimiter, resendRules, ctrl.resendVerification);

// Protected
router.get ('/me',              authenticate, ctrl.getMe);
router.put ('/profile',         authenticate, ctrl.updateProfile);
router.put ('/change-password', authenticate, ctrl.changePassword);

module.exports = router;

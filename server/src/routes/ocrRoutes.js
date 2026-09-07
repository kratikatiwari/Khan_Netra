'use strict';
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/ocrController');
const { authenticate } = require('../middleware/auth');
const visionUpload = require('../middleware/visionUpload');
const rateLimit    = require('express-rate-limit');

const ocrLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many OCR requests. Please wait.' },
});

router.use(authenticate);
router.get('/health', ctrl.health);
router.post('/extract', ocrLimiter, visionUpload.single('document'), ctrl.extractDocument);

module.exports = router;

'use strict';
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/disasterController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/active',          ctrl.getActive);
router.get('/alerts',          ctrl.getAlerts);
router.get('/history',         ctrl.getHistory);
router.get('/stats',           ctrl.getStats);
router.post('/acknowledge/:id',ctrl.acknowledge);
router.post('/resolve/:id',    ctrl.resolve);
router.post('/test',           authorize('admin','government_officer','safety_officer'), ctrl.createTest);
router.post('/poll',           authorize('admin','government_officer'), ctrl.pollNow);

module.exports = router;

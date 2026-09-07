const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/riskDashboardController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/high-risk',    ctrl.getHighRisk);
router.get('/role-based',   ctrl.getRoleBasedDashboard);
router.get('/gis',          ctrl.getGisData);

module.exports = router;

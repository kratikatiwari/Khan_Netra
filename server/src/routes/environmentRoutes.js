const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/environmentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.getReadings);
router.get('/alerts', ctrl.getAlerts);
router.get('/dashboard', ctrl.getDashboardSummary);
router.get('/trends', ctrl.getTrends);
router.get('/mine/:id/latest', ctrl.getLatestByMine);
router.post('/', ctrl.createReading);

module.exports = router;

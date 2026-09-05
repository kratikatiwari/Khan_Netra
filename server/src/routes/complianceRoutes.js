const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/complianceController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/records', ctrl.getRecords);
router.get('/regulations', ctrl.getRegulations);
router.get('/mine/:id/score', ctrl.getMineComplianceScore);
router.post('/mine/:mine_id/ai-assessment', ctrl.runAiAssessment);
router.post('/records', authorize('admin', 'government_officer', 'inspector', 'safety_officer'), ctrl.create);
router.put('/records/:id', authorize('admin', 'government_officer', 'inspector', 'safety_officer'), ctrl.update);
router.post('/regulations', authorize('admin', 'government_officer'), ctrl.createRegulation);

module.exports = router;

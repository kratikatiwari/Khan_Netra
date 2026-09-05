const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inspectionController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.getAll);
router.get('/schedule', ctrl.getSchedule);
router.get('/:id', ctrl.getById);
router.post('/', authorize('admin', 'government_officer', 'inspector'), ctrl.create);
router.put('/:id', authorize('admin', 'government_officer', 'inspector'), ctrl.update);
router.post('/checklist', authorize('admin', 'government_officer', 'inspector'), ctrl.saveChecklist);

module.exports = router;

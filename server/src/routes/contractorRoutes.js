const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/contractorController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/',         ctrl.getAll);
router.get('/stats',    ctrl.getStats);
router.get('/:id',      ctrl.getById);
router.post('/',        authorize('admin','government_officer','mine_manager','inspector'), ctrl.create);
router.put('/:id',      authorize('admin','government_officer','mine_manager','inspector'), ctrl.update);
router.delete('/:id',   authorize('admin','government_officer'), ctrl.delete);

module.exports = router;

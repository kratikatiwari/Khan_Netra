const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aiController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.post('/chat', ctrl.chat);
router.get('/chat/sessions', ctrl.getSessions);
router.get('/chat/:session_id', ctrl.getChatHistory);
router.get('/risk/:mine_id', ctrl.getRiskPrediction);
router.get('/users', authorize('admin', 'government_officer'), ctrl.getUsersList);
router.put('/users/:id', authorize('admin'), ctrl.updateUser);

module.exports = router;

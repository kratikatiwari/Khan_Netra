const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/register', ctrl.register);
router.post('/refresh', ctrl.refreshToken);
router.get('/me', authenticate, ctrl.getMe);
router.put('/profile', authenticate, ctrl.updateProfile);
router.put('/change-password', authenticate, ctrl.changePassword);

module.exports = router;

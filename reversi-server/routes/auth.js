const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/google', authController.googleAuth);
router.post('/anonymous', authController.anonymousAuth);


module.exports = router;

const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { getRecentLogs } = require('../controllers/logController');

router.use(auth);
router.get('/', getRecentLogs);

module.exports = router; 
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const auth = require('../middlewares/authMiddleware');
const User = require('../models/User');

router.post('/register', register);
router.post('/login', login);

// Get all users (for assignment)
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({}, 'username email');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

module.exports = router; 
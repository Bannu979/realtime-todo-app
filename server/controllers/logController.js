const ActionLog = require('../models/ActionLog');
const { broadcastLogUpdate } = require('../socket');

exports.getRecentLogs = async (req, res) => {
  try {
    const logs = await ActionLog.find()
      .sort({ timestamp: -1 })
      .limit(20)
      .populate('user', 'username email');
    res.json(logs);
    // Optionally: logs.forEach(log => broadcastLogUpdate(log));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 
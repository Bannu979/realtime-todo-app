const mongoose = require('mongoose');

const actionLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  task: { type: mongoose.Schema.Types.Mixed, required: true },
});

module.exports = mongoose.model('ActionLog', actionLogSchema); 
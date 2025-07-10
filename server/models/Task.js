const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  assignedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Todo', 'In Progress', 'Done'], default: 'Todo' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  updatedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 },
});

taskSchema.index({ title: 1 }, { unique: true }); // Unique title per board (single board for now)

module.exports = mongoose.model('Task', taskSchema); 
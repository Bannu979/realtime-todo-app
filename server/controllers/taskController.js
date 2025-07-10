const Task = require('../models/Task');
const ActionLog = require('../models/ActionLog');
const forbiddenTitles = ['Todo', 'In Progress', 'Done'];
const { smartAssignUser } = require('../utils/smartAssign');
const { broadcastTaskUpdate, broadcastLogUpdate } = require('../socket');

async function logAction(userId, action, task) {
  const log = await ActionLog.create({ user: userId, action, task });
  broadcastLogUpdate(log);
}

exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedUser, status, priority } = req.body;
    if (!title || forbiddenTitles.includes(title)) {
      return res.status(400).json({ message: 'Invalid or forbidden task title.' });
    }
    const existing = await Task.findOne({ title });
    if (existing) {
      return res.status(400).json({ message: 'Task title must be unique.' });
    }
    const task = new Task({ title, description, assignedUser, status, priority });
    await task.save();
    await logAction(req.user.userId, 'create', task);
    broadcastTaskUpdate(task);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    let query = {};
    if (req.query.title) {
      query.title = req.query.title;
    }
    const tasks = await Task.find(query).populate('assignedUser', 'username email');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignedUser', 'username email');
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { title, description, assignedUser, status, priority, version } = req.body;
    if (title && forbiddenTitles.includes(title)) {
      return res.status(400).json({ message: 'Invalid or forbidden task title.' });
    }
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    // Conflict handling: check version
    if (version && version !== task.version) {
      return res.status(409).json({ message: 'Task version conflict.', serverTask: task });
    }
    if (title) task.title = title;
    if (description) task.description = description;
    if (assignedUser) task.assignedUser = assignedUser;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    task.version += 1;
    task.updatedAt = Date.now();
    await task.save();
    await logAction(req.user.userId, 'update', task);
    broadcastTaskUpdate(task);
    res.json(task);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Task title must be unique.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    await logAction(req.user.userId, 'delete', task);
    broadcastTaskUpdate(task);
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.smartAssignTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    const userId = await smartAssignUser();
    if (!userId) return res.status(400).json({ message: 'No users available for assignment.' });
    task.assignedUser = userId;
    task.version += 1;
    task.updatedAt = Date.now();
    await task.save();
    await logAction(req.user.userId, 'smart_assign', task);
    broadcastTaskUpdate(task);
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}; 
const Task = require('../models/Task');
const User = require('../models/User');

// Returns the userId with the fewest active (non-done) tasks
async function smartAssignUser() {
  // Get all users
  const users = await User.find();
  if (users.length === 0) return null;
  // Count active tasks for each user
  const counts = await Promise.all(users.map(async (user) => {
    const activeCount = await Task.countDocuments({ assignedUser: user._id, status: { $ne: 'Done' } });
    return { userId: user._id, count: activeCount };
  }));
  // Find the user with the minimum count
  counts.sort((a, b) => a.count - b.count);
  return counts[0].userId;
}

module.exports = { smartAssignUser }; 
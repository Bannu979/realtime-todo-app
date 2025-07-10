let io;

function initSocket(server) {
  if (!server) return; // No-op for serverless (Vercel)
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    // Optionally log connections
    // console.log('User connected:', socket.id);
    socket.on('disconnect', () => {
      // console.log('User disconnected:', socket.id);
    });
  });
}

function broadcastTaskUpdate(task) {
  if (io) io.emit('taskUpdate', task);
}

function broadcastLogUpdate(log) {
  if (io) io.emit('logUpdate', log);
}

module.exports = { initSocket, broadcastTaskUpdate, broadcastLogUpdate }; 
// Run with: node socketTest.js
// Make sure to install socket.io-client: npm install socket.io-client

const { io } = require('socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to Socket.IO server');
});

socket.on('taskUpdate', (task) => {
  console.log('Received taskUpdate:', task);
});

socket.on('logUpdate', (log) => {
  console.log('Received logUpdate:', log);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
}); 
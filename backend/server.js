require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/user.model'); // Ensure this path is correct

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow your React frontend to connect
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`⚡️ User connected: ${socket.id}`);

  // When a user explicitly sets themselves online (e.g., after login)
  socket.on('set_online', async (userId) => {
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, { isOnline: true, lastActive: new Date() });
        console.log(`✅ User ${userId} is now online.`);
        io.emit('status_updated', { userId, isOnline: true }); // Notify others if needed
      } catch (error) {
        console.error('Error setting user online:', error);
        socket.emit('error', { message: 'Failed to set online status.' });
      }
    }
  });

  socket.on('disconnect', async () => {
    console.log(`💨 User disconnected: ${socket.id}`);
    // Find the user associated with this socket and set them offline
    // In a real app, you'd map socket.id to userId.
    // For this example, we'll assume the client will manage their own offline status on logout.
    // A more robust solution involves storing socket.id -> userId mapping on connect
    // and cleaning it up here to set the specific user offline.
    // E.g., const userId = getUserIdFromSocketId(socket.id);
    // if (userId) {
    //   await User.findByIdAndUpdate(userId, { isOnline: false, lastActive: new Date() });
    //   io.emit('status_updated', { userId, isOnline: false });
    // }
  });
});


// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🍃 MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
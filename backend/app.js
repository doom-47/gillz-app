const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/user.routes');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for all origins (for development)
app.use(express.json()); // Parse JSON request bodies

// Routes
app.use('/api/users', userRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Gillz Backend API is running!');
});

// Error handling middleware (optional but recommended)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;

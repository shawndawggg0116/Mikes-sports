const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 5000;

// MongoDB connection 
// ... (your existing MongoDB connection code)

// Middleware
// ... (your existing middleware)

// User schema 
// ... (your existing userSchema)

const User = mongoose.model('User', userSchema);

// Game schema
const gameSchema = new mongoose.Schema({
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date }, // Estimated end time (can be calculated based on start time)
  status: { type: String, enum: ['upcoming', 'in_progress', 'finished'], default: 'upcoming' },
});

const Game = mongoose.model('Game', gameSchema);

// Routes
// ... (Your existing user routes: Register, Login, etc.)

// Fetch user's picked teams with week information
// ... (Your existing get-picked-teams route)

// Fetch available teams for the current week
app.get('/get-available-teams', async (req, res) => {
  try {
    const allGames = await Game.find().select('homeTeam awayTeam startTime endTime status'); 
    res.send({ success: true, games: allGames }); 
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status(500).send({ success: false, message: 'Error fetching available teams.' });
  }
});

// Handle team selection (with week check)
// ... (Your existing select-team route)

// Helper function to determine game status
function determineGameStatus(startTime, endTime) {
  const now = new Date();

  if (now < startTime) {
    return 'upcoming';
  } else if (now >= startTime && (!endTime || now <= endTime)) {
    return 'in_progress';
  } else {
    return 'finished';
  }
}

// Socket.IO event listeners
io.on('connection', (socket) => {
  console.log('A user connected');

  // Emit initial game status updates to the connected client
  emitGameStatusUpdates(socket);

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Function to emit game status updates to a specific socket
const emitGameStatusUpdates = async (socket) => {
  try {
    const games = await Game.find();
    games.forEach(game => {
      const status = determineGameStatus(game.startTime, game.endTime);
      socket.emit('gameStatusUpdate', { gameId: game._id, status: status });
    });
  } catch (error) {
    console.error('Error emitting game status updates:', error);
  }
};

// Start the server
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// (Optional: Schedule periodic game status updates)
// ... (Use a library like `node-cron` to schedule the `updateGameStatuses` function)
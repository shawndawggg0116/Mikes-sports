const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const socketIO = require('socket.io'); // Include Socket.IO for real-time updates

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pickedTeams: [{ team: String, week: Number }],
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

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
// ... (Your existing logic to fetch picked teams)

// Fetch available teams for the current week
app.get('/get-available-teams', async (req, res) => {
  try {
    const currentWeek = getWeek(new Date()); // Get the current week
    const today = new Date();

    const availableGames = await Game.find({
      startTime: { $gte: today },
    });

    const availableTeams = availableGames.map(game => [
      game.homeTeam,
      game.awayTeam,
    ]).flat();

    res.send({ success: true, teams: availableTeams });
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status
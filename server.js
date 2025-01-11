const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log('Connected to MongoDB'))
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

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  selectedTeam: { type: String, default: null },
  pickedTeams: { type: [String], default: [] },
  lastPickDate: { type: Date, default: null },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const gameSchema = new mongoose.Schema({
  gameId: String,
  team1: String,
  team2: String,
  startTime: Date,
  endTime: Date,
  status: { type: String, default: 'scheduled' }, // 'scheduled', 'playing', 'finished'
  winningTeam: String
});

const User = mongoose.model('User', userSchema);
const Game = mongoose.model('Game', gameSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/teams', async (req, res) => {
  try {
    const username = req.session.username;
    if (!username) return res.status(401).send('Unauthorized. Please log in.');

    const user = await User.findOne({ username });
    if (!user) return res.status(404).send('User not found.');

    const now = new Date();
    const games = await Game.find();

    const teamStatuses = {};
    games.forEach((game) => {
      if (game.status === 'finished') {
        teamStatuses[game.team1] = 'played';
        teamStatuses[game.team2] = 'played';
      } else if (game.startTime <= now && now <= game.endTime) {
        teamStatuses[game.team1] = 'playing';
        teamStatuses[game.team2] = 'playing';
      } else {
        teamStatuses[game.team1] = 'available';
        teamStatuses[game.team2] = 'available';
      }
    });

    user.pickedTeams.forEach((team) => {
      teamStatuses[team] = 'picked';
    });

    res.json({ teamStatuses });
  } catch (error) {
    console.error('Error fetching team statuses:', error.message);
    res.status(500).send('Error fetching team statuses.');
  }
});

// Weekly reset of selected teams
cron.schedule('0 0 * * 2', async () => {
  try {
    await User.updateMany({}, { selectedTeam: null });
    console.log('All user selected teams have been reset for the week.');
  } catch (error) {
    console.error('Error resetting user teams:', error);
  }
});

// Other routes and logic (register, login, leaderboard, etc.)
// ... Add your existing routes here

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
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
app.use(express.static(path.join(__dirname, 'public')));
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
  selectedTeam: { type: String, default: null },
  pickedTeams: { type: [String], default: [] },
  lastPickDate: { type: Date, default: null },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Game schema
const gameSchema = new mongoose.Schema({
  gameId: { type: String, required: true },
  week: { type: Number, required: true },
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, default: 'scheduled' } // scheduled, in progress, finished
});

const Game = mongoose.model('Game', gameSchema);

// Helper: Get current NFL week
function getCurrentNFLWeek() {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 7); // Example: Sept 7th
  return Math.ceil((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
}

// Fetch NFL Games
async function fetchNFLGames(week, season) {
  const API_KEY = 'your-api-key'; // Replace with your SportsData.io API key
  const url = `https://api.sportsdata.io/v3/nfl/scores/json/GamesByWeek/${season}/${week}`;

  try {
    const response = await axios.get(url, {
      headers: { 'Ocp-Apim-Subscription-Key': API_KEY }
    });

    const games = response.data;

    for (const game of games) {
      const startTime = new Date(game.Date);
      const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // Approximate 3-hour duration

      await Game.updateOne(
        { gameId: game.GameKey },
        {
          gameId: game.GameKey,
          week: game.Week,
          team1: game.HomeTeam,
          team2: game.AwayTeam,
          startTime,
          endTime,
          status: game.Status // scheduled, in progress, final
        },
        { upsert: true }
      );
    }

    console.log(`Week ${week} NFL schedule updated.`);
  } catch (error) {
    console.error('Error fetching NFL games:', error);
  }
}

// Schedule Cron Job to Fetch Games
cron.schedule('0 0 * * *', async () => {
  const week = getCurrentNFLWeek();
  const season = new Date().getFullYear();

  console.log(`Fetching live data for Week ${week}...`);
  await fetchNFLGames(week, season);
});

// Fetch available teams
app.get('/available-teams', async (req, res) => {
  const now = new Date();

  try {
    const upcomingGames = await Game.find({ startTime: { $gt: now } });
    const availableTeams = [];

    upcomingGames.forEach(game => {
      availableTeams.push(game.team1, game.team2);
    });

    res.json({ success: true, availableTeams });
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status(500).send({ success: false, message: 'Failed to fetch available teams.' });
  }
});

// Handle team selection
app.post('/select-team', async (req, res) => {
  const { username, team } = req.body;

  if (!username || !team) {
    return res.status(400).json({ success: false, message: 'Username and team are required.' });
  }

  const now = new Date();

  try {
    const game = await Game.findOne({
      $or: [{ team1: team }, { team2: team }],
      startTime: { $lte: now }
    });

    if (game) {
      return res.status(400).json({ success: false, message: 'This game has already started.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.selectedTeam = team;
    user.pickedTeams.push(team);
    await user.save();

    res.json({ success: true, message: `You picked ${team}` });
  } catch (error) {
    console.error('Error selecting team:', error);
    res.status(500).json({ success: false, message: 'Failed to select team.' });
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


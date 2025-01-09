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

// Fetch live NFL games
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

// Cron job to fetch NFL games daily
cron.schedule('0 0 * * *', async () => {
  const week = getCurrentNFLWeek();
  const season = new Date().getFullYear();

  console.log(`Fetching live data for Week ${week}...`);
  await fetchNFLGames(week, season);
});

// Helper: Get current NFL week
function getCurrentNFLWeek() {
  const now = new Date();
  const seasonStart = new Date(now.getFullYear(), 8, 7); // Example: Sept 7th
  return Math.ceil((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
}

// Cron job to reset weekly team selections
cron.schedule('0 0 * * 2', async () => {
  try {
    const users = await User.find();
    users.forEach(async user => {
      user.selectedTeam = null; // Reset selected team
      user.lastPickDate = null; // Allow new picks
      await user.save();
    });
    console.log('Weekly team selection reset for all users.');
  } catch (error) {
    console.error('Error resetting teams:', error);
  }
});

// Routes

// Root Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the registration page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Register a user
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send('Username already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).send('User registered successfully!');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user.');
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send('Invalid credentials.');
    }

    req.session.username = username; // Set username in session
    res.redirect('/teams'); // Redirect to the team selection page
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Error logging in.');
  }
});

// Fetch logged-in username
app.get('/get-logged-in-user', (req, res) => {
  if (!req.session || !req.session.username) {
    return res.status(401).send({ error: 'User not logged in' });
  }
  res.send({ username: req.session.username });
});

// Serve the team selection page
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
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

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

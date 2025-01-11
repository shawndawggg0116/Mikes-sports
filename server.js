// Updated server.js to properly handle login and redirect without incorrect paths
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://shawnbuckhannon:<db_password>@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority",
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
  team: String,
  status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
  gameDate: Date,
});

const Game = mongoose.model('Game', gameSchema);

// Fetch NFL schedule and update database
async function fetchAndStoreSchedule() {
  try {
    const response = await axios.get('https://api.example.com/nfl/schedule', {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
      },
    });

    const schedule = response.data;
    for (const game of schedule) {
      const existingGame = await Game.findOne({ team: game.team });
      if (!existingGame) {
        await Game.create({
          team: game.team,
          status: game.status,
          gameDate: new Date(game.date),
        });
      } else {
        existingGame.status = game.status;
        existingGame.save();
      }
    }
  } catch (error) {
    console.error('Error fetching schedule:', error);
  }
}

// Update user points based on completed games
async function updateUserPoints() {
  try {
    const completedGames = await Game.find({ status: 'completed' });
    for (const game of completedGames) {
      const users = await User.find({ selectedTeam: game.team });
      for (const user of users) {
        user.points += 1;
        user.selectedTeam = null; // Reset selected team for the next week
        await user.save();
      }
    }
  } catch (error) {
    console.error('Error updating user points:', error);
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt by user: ${username}`);
  if (!username || !password) {
    console.log('Missing username or password');
    return res.status(400).send('Username and password are required.');
  }
  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found');
      return res.status(404).send('User not found.');
    }
    console.log('User found in database:', user);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.status(401).send('Invalid credentials.');
    }
    req.session.username = username;
    console.log('Login successful for user:', username);
    res.redirect('/teams');
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Error logging in.');
  }
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

app.get('/rules', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rules.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/fetch-schedule', async (req, res) => {
  await fetchAndStoreSchedule();
  res.send('Schedule fetched and stored.');
});

app.get('/update-points', async (req, res) => {
  await updateUserPoints();
  res.send('User points updated.');
});

app.get('/get-games', async (req, res) => {
  try {
    const games = await Game.find();
    res.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).send('Error fetching games.');
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

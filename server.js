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
  gameId: String,
  week: Number,
  team1: String,
  team2: String,
  startTime: Date,
  endTime: Date,
  status: String, // "scheduled", "in-progress", or "finished"
});

const Game = mongoose.model('Game', gameSchema);

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
app.get('/teams', async (req, res) => {
  try {
    const username = req.session.username;
    if (!username) {
      return res.status(401).send('User not logged in');
    }

    const now = new Date();
    const games = await Game.find();
    const user = await User.findOne({ username });

    const teamStatuses = {};
    games.forEach((game) => {
      const { team1, team2, startTime, endTime, status } = game;

      if (status === 'finished') {
        teamStatuses[team1] = 'played'; // Grey
        teamStatuses[team2] = 'played'; // Grey
      } else if (startTime <= now && now <= endTime) {
        teamStatuses[team1] = 'playing'; // Yellow
        teamStatuses[team2] = 'playing'; // Yellow
      } else {
        teamStatuses[team1] = 'available'; // Green
        teamStatuses[team2] = 'available'; // Green
      }
    });

    if (user) {
      user.pickedTeams.forEach((team) => {
        teamStatuses[team] = 'picked'; // Red
      });
    }

    res.json(teamStatuses);
  } catch (error) {
    console.error('Error serving team selection page:', error);
    res.status(500).send('Error serving team selection page.');
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


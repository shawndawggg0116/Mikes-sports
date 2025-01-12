// Updated server.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
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
app.post('/', async (req, res) => {
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

    req.session.username = username;
    res.redirect('/teams');
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

// Fetch NFL games and their current status
app.get('/get-nfl-teams', async (req, res) => {
  try {
    const response = await axios.get('https://api.example.com/nfl/games', {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
      },
    });

    const games = response.data;
    const teamStatus = {};
    const now = new Date();

    games.forEach((game) => {
      const { teamA, teamB, status, date } = game;
      const gameDate = new Date(date);

      if (status === 'live') {
        teamStatus[teamA] = 'yellow';
        teamStatus[teamB] = 'yellow';
      } else if (gameDate < now) {
        teamStatus[teamA] = 'grey';
        teamStatus[teamB] = 'grey';
      } else {
        teamStatus[teamA] = 'green';
        teamStatus[teamB] = 'green';
      }
    });

    res.json(teamStatus);
  } catch (error) {
    console.error('Error fetching NFL games:', error);
    res.status(500).send('Error fetching NFL games.');
  }
});

// Handle team selection
app.post('/select-team', async (req, res) => {
  const { username, team } = req.body;

  if (!username || !team) {
    return res.status(400).send({ success: false, message: 'Username and team are required.' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ success: false, message: 'User not found.' });
    }

    const now = new Date();
    const resetDay = 2; // Tuesday
    const today = now.getUTCDay();

    if (user.lastPickDate) {
      const lastPickDate = new Date(user.lastPickDate);
      if (today !== resetDay && now - lastPickDate < 7 * 24 * 60 * 60 * 1000) {
        return res.status(400).send({ success: false, message: 'You can only pick one team per week.' });
      }
    }

    user.selectedTeam = team;
    user.pickedTeams.push(team);
    user.lastPickDate = now;
    await user.save();

    res.send({ success: true, message: `You picked ${team}` });
  } catch (error) {
    console.error('Error selecting team:', error);
    res.status(500).send({ success: false, message: 'Error selecting team.' });
  }
});

// Serve the team selection page
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

// Serve the leaderboard page
app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

// Serve the rules page
app.get('/rules', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rules.html'));
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

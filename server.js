const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
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
  team: String,
  status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
  gameDate: Date,
  score: { type: String, default: null },
});

const Game = mongoose.model('Game', gameSchema);

// Fetch NFL schedule and store in the database
async function fetchAndStoreSchedule() {
  try {
    const response = await axios.get('https://api.sportsdata.io/v3/nfl/scores/json/Schedules/2023', {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.RAPIDAPI_KEY,
      },
    });

    const schedule = response.data;
    for (const game of schedule) {
      const existingGame = await Game.findOne({ team: game.AwayTeam });
      if (!existingGame) {
        await Game.create({
          team: game.AwayTeam,
          status: 'upcoming',
          gameDate: new Date(game.Date),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching schedule:', error);
  }
}

// Update game scores in the database
async function updateGameScores() {
  try {
    const response = await axios.get('https://api.sportsdata.io/v3/nfl/scores/json/ScoresByWeek/2023REG/1', {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.RAPIDAPI_KEY,
      },
    });

    const scores = response.data;
    for (const score of scores) {
      const game = await Game.findOne({ team: score.AwayTeam });
      if (game) {
        game.score = `${score.AwayScore} - ${score.HomeScore}`;
        game.status = score.Status.toLowerCase();
        await game.save();
      }
    }
  } catch (error) {
    console.error('Error updating scores:', error);
  }
}

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

// Serve the leaderboard page
app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

// Fetch leaderboard data
app.get('/get-leaderboard', async (req, res) => {
  try {
    const users = await User.find({}, 'username selectedTeam points').sort({ points: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).send('Error fetching leaderboard.');
  }
});

// Fetch live scores
app.get('/get-live-scores', async (req, res) => {
  try {
    const liveScores = await Game.find({ status: 'live' });
    res.json(liveScores);
  } catch (error) {
    console.error('Error fetching live scores:', error);
    res.status(500).send('Error fetching live scores.');
  }
});

// Admin Routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fetch NFL schedule
app.get('/fetch-schedule', async (req, res) => {
  await fetchAndStoreSchedule();
  res.send('Schedule fetched and stored.');
});

// Update game scores
app.get('/update-scores', async (req, res) => {
  await updateGameScores();
  res.send('Game scores updated.');
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

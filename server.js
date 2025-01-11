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

// Define Game schema
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

// Define NFL Team schema
const teamSchema = new mongoose.Schema({
  id: String,
  abbreviation: String,
  name: String,
  conference: String,
  division: String,
});

const Team = mongoose.model('Team', teamSchema);

// Function to fetch and store NFL schedule
async function fetchAndStoreSchedule() {
  try {
    const response = await axios.get('https://nfl-api-data.p.rapidapi.com/nfl-schedule/v1/data', {
      headers: {
        'x-rapidapi-host': 'nfl-api-data.p.rapidapi.com',
        'x-rapidapi-key': '10bf18f0demshb31eaae24d15703p127820jsn83bb8d8273b',
      },
    });

    const schedule = response.data.map(game => ({
      gameId: game.gameId,
      week: game.week,
      team1: game.team1,
      team2: game.team2,
      startTime: new Date(game.startTime),
      endTime: new Date(game.endTime),
      status: game.status,
    }));

    await Game.insertMany(schedule);
    console.log('NFL schedule successfully stored.');
  } catch (error) {
    console.error('Error fetching schedule:', error);
  }
}

// Function to fetch and store NFL teams
async function fetchAndStoreNFLTeams() {
  try {
    const response = await axios.get('https://nfl-api-data.p.rapidapi.com/nfl-team-listing/v1/data', {
      headers: {
        'x-rapidapi-host': 'nfl-api-data.p.rapidapi.com',
        'x-rapidapi-key': '10bf18f0demshb31eaae24d15703p127820jsn83bb8d8273b',
      },
    });

    const teams = response.data.map(team => ({
      id: team.id,
      abbreviation: team.abbreviation,
      name: team.name,
      conference: team.conference,
      division: team.division,
    }));

    await Team.insertMany(teams, { ordered: false });
    console.log('NFL teams successfully stored.');
  } catch (error) {
    console.error('Error fetching NFL teams:', error);
  }
}

// Routes for fetching NFL schedule and teams
app.get('/fetch-schedule', async (req, res) => {
  try {
    await fetchAndStoreSchedule();
    res.send('NFL schedule fetched and stored successfully!');
  } catch (error) {
    res.status(500).send('Error fetching schedule.');
  }
});

app.get('/fetch-teams', async (req, res) => {
  try {
    await fetchAndStoreNFLTeams();
    res.send('NFL teams fetched and stored successfully!');
  } catch (error) {
    res.status(500).send('Error fetching NFL teams.');
  }
});

// Existing routes for login, registration, team selection, leaderboard, admin, etc.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

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

    req.session.username = username;
    res.redirect('/teams');
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Error logging in.');
  }
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

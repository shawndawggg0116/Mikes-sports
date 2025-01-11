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
)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

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

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  selectedTeam: { type: String, default: null },
  pickedTeams: { type: [String], default: [] },
  lastPickDate: { type: Date, default: null },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Game Schema
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

// NFL Team Schema
const teamSchema = new mongoose.Schema({
  id: String,
  abbreviation: String,
  name: String,
  conference: String,
  division: String,
});

const Team = mongoose.model('Team', teamSchema);

// Function to fetch NFL schedule
async function fetchAndStoreSchedule() {
  try {
    const response = await axios.get('https://api.balldontlie.io/v1/nfl/schedules', {
      headers: { Authorization: '1384160c-0e89-4e67-a763-23f51b996df9' },
    });

    const schedule = response.data.map((game) => ({
      gameId: game.id,
      week: game.week,
      team1: game.home_team.abbreviation,
      team2: game.visitor_team.abbreviation,
      startTime: new Date(game.date),
      endTime: new Date(new Date(game.date).getTime() + 3 * 60 * 60 * 1000),
      status: 'scheduled',
    }));

    await Game.insertMany(schedule);
    console.log('NFL schedule successfully stored.');
  } catch (error) {
    console.error('Error fetching schedule:', error);
  }
}

// Function to fetch NFL teams
async function fetchNFLTeams() {
  try {
    const response = await axios.get('https://nfl-api-data.p.rapidapi.com/nfl-team-listing/v1/data', {
      headers: {
        'x-rapidapi-host': 'nfl-api-data.p.rapidapi.com',
        'x-rapidapi-key': '10bf18f0demshb31eaae24d15703p127820jsn83bb8d8273b',
      },
    });

    const teams = response.data.map((team) => ({
      id: team.id,
      abbreviation: team.abbreviation,
      name: team.name,
      conference: team.conference,
      division: team.division,
    }));

    await Team.insertMany(teams, { ordered: false });
    console.log('NFL teams successfully stored in MongoDB.');
  } catch (error) {
    console.error('Error fetching NFL teams:', error);
    throw error;
  }
}

// Routes
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
    await fetchNFLTeams();
    res.send('NFL teams fetched and stored successfully!');
  } catch (error) {
    res.status(500).send('Error fetching NFL teams.');
  }
});

// Other Routes for login, registration, leaderboard, etc.
// These remain unchanged from your original code

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

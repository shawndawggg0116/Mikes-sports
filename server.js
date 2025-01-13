const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
const cheerio = require('cheerio');
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

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
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

// Login functionality
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).send('User not found.');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send('Invalid credentials.');
    req.session.username = username;
    res.redirect('/teams');
  } catch (error) {
    res.status(500).send('Error logging in.');
  }
});

// Fetch logged-in user
app.get('/get-logged-in-user', (req, res) => {
  if (!req.session.username) return res.status(401).json({ error: 'User not logged in' });
  res.json({ username: req.session.username });
});

// Fetch picked teams
app.get('/get-picked-teams', async (req, res) => {
  const { username } = req.query;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, pickedTeams: user.pickedTeams });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching picked teams.' });
  }
});

// Select team
app.post('/select-team', async (req, res) => {
  const { username, team } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.pickedTeams.includes(team)) {
      return res.status(400).json({ success: false, message: 'You already picked this team.' });
    }
    user.selectedTeam = team;
    user.pickedTeams.push(team);
    await user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error selecting team.' });
  }
});

// Scrape NFL teams
let cachedTeams = [];
async function scrapeAndCacheNFLTeams() {
  try {
    const url = 'https://www.pro-football-reference.com/teams/';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const teams = [];
    $('table#teams_active tbody tr').each((i, el) => {
      const teamName = $(el).find('th[data-stat="team_name"] a').text();
      const wins = $(el).find('td[data-stat="wins"]').text();
      const losses = $(el).find('td[data-stat="losses"]').text();
      if (teamName) teams.push({ teamName, wins: parseInt(wins, 10), losses: parseInt(losses, 10), gameStartTime: null });
    });
    cachedTeams = teams.map(team => ({ ...team, gameStatus: 'not started' }));
  } catch (error) {
    console.error('Error scraping NFL teams:', error);
  }
}

// Schedule scraping
cron.schedule('0 */6 * * *', scrapeAndCacheNFLTeams);
scrapeAndCacheNFLTeams();

// Fetch teams
app.get('/nfl-teams', (req, res) => {
  res.json(cachedTeams);
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

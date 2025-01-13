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
  'mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority',
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

// Admin routes
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'password') {
    res.redirect('/admin');
  } else {
    res.status(401).send('Invalid admin credentials.');
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username'); // Fetch usernames
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching users.');
  }
});

app.post('/admin/delete-user', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).send('Username is required.');

  try {
    const user = await User.findOneAndDelete({ username });
    if (!user) return res.status(404).send('User not found.');
    res.send('User deleted successfully!');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send('Error deleting user.');
  }
});

app.post('/admin/update-points', async (req, res) => {
  const { username, points } = req.body;
  if (!username || points === undefined) return res.status(400).send('Username and points are required.');

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).send('User not found.');
    user.points = points;
    await user.save();
    res.send('Points updated successfully!');
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).send('Error updating points.');
  }
});

app.post('/admin/unlock-teams', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).send('Username is required.');

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).send('User not found.');
    user.pickedTeams = [];
    await user.save();
    res.send('Teams unlocked successfully!');
  } catch (error) {
    console.error('Error unlocking teams:', error);
    res.status(500).send('Error unlocking teams.');
  }
});

app.post('/admin/unlock-all-teams', async (req, res) => {
  try {
    await User.updateMany({}, { pickedTeams: [] });
    res.send('All teams unlocked for all users!');
  } catch (error) {
    console.error('Error unlocking all teams:', error);
    res.status(500).send('Error unlocking all teams.');
  }
});

// Scraper and cron job
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
      const gameStatus = Math.random() < 0.3 ? 'playing' : Math.random() < 0.5 ? 'finished' : 'not_started'; // Simulate game status

      if (teamName) {
        teams.push({
          teamName,
          wins: parseInt(wins, 10) || 0,
          losses: parseInt(losses, 10) || 0,
          status: gameStatus,
        });
      }
    });

    cachedTeams = teams;
    console.log('NFL team data updated with status!');
  } catch (error) {
    console.error('Error scraping NFL teams:', error);
  }
}

// Reset team statuses every Tuesday
cron.schedule('0 0 * * 2', () => {
  cachedTeams.forEach(team => team.status = 'not_started');
  console.log('Teams reset to not_started for the new week!');
});

// Fetch NFL teams
app.get('/nfl-teams', (req, res) => {
  if (cachedTeams.length === 0) {
    return res.status(503).send('NFL team data is not available yet. Please try again later.');
  }
  res.json(cachedTeams);
});

// Routes

app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/teams', (req, res) => res.sendFile(path.join(__dirname, 'public', 'teams.html')));
app.get('/leaderboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'leaderboard.html')));
app.get('/rules', (req, res) => res.sendFile(path.join(__dirname, 'public', 'rules.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Run the scraper initially
scrapeAndCacheNFLTeams();
cron.schedule('0 */6 * * *', scrapeAndCacheNFLTeams);

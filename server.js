const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const puppeteer = require('puppeteer');

process.env.PUPPETEER_CACHE_DIR = '/opt/render/.cache/puppeteer';

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

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Live schedule route
let cachedSchedule = [];
app.get('/live-schedule', (req, res) => {
  if (cachedSchedule.length === 0) {
    return res.status(503).send('Live schedule data is not available yet. Please try again later.');
  }
  res.json(cachedSchedule);
});

// Route to serve the games page
app.get('/games', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'games.html'));
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

app.get('/get-logged-in-user', (req, res) => {
  if (!req.session || !req.session.username) {
    return res.status(401).send({ error: 'User not logged in' });
  }
  res.send({ username: req.session.username });
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

app.get('/get-picked-teams', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).send({ success: false, message: 'Username is required.' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ success: false, message: 'User not found.' });
    }

    res.send({ success: true, pickedTeams: user.pickedTeams });
  } catch (error) {
    console.error('Error fetching picked teams:', error);
    res.status(500).send({ success: false, message: 'Error fetching picked teams.' });
  }
});

app.get('/get-leaderboard', async (req, res) => {
  try {
    const users = await User.find({}, 'username selectedTeam points').sort({ points: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).send('Error fetching leaderboard.');
  }
});

// Admin Routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/admin/delete-user', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).send('Username is required.');
  }

  try {
    const user = await User.findOneAndDelete({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    res.send('User deleted successfully!');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send('Error deleting user.');
  }
});

app.post('/admin/update-points', async (req, res) => {
  const { username, points } = req.body;

  if (!username || points === undefined) {
    return res.status(400).send('Username and points are required.');
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

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

  if (!username) {
    return res.status(400).send('Username is required.');
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    user.pickedTeams = [];
    await user.save();
    res.send('Teams unlocked successfully!');
  } catch (error) {
    console.error('Error unlocking teams:', error);
    res.status(500).send('Error unlocking teams.');
  }
});

// Puppeteer scraper for live schedules
async function scrapeNFLSchedule() {
  try {
    const url = 'https://www.nfl.com/schedules/';
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const schedule = await page.evaluate(() => {
      const scheduleData = [];
      document.querySelectorAll('.nfl-o-matchup-group').forEach(group => {
        const week = group.querySelector('.d3-o-section-title')?.innerText.trim() || 'Unknown Week';
        group.querySelectorAll('.nfl-c-matchup-strip').forEach(game => {
          const homeTeam = game.querySelector('.nfl-c-matchup-strip__team-fullname--home')?.innerText.trim();
          const awayTeam = game.querySelector('.nfl-c-matchup-strip__team-fullname--away')?.innerText.trim();
          const status = game.querySelector('.nfl-c-matchup-strip__date')?.innerText.trim();
          if (homeTeam && awayTeam) scheduleData.push({ week, homeTeam, awayTeam, status });
        });
      });
      return scheduleData;
    });

    await browser.close();
    cachedSchedule = schedule;
  } catch (error) {
    console.error('Error scraping NFL schedule:', error.message);
  }
}

// Scrape on startup and every 6 hours
scrapeNFLSchedule();
cron.schedule('0 */6 * * *', scrapeNFLSchedule);

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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

// Routes
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

    if (user.pickedTeams.includes(team)) {
      return res.status(400).send({ success: false, message: 'You already picked this team.' });
    }

    const now = new Date();
    const lastPickDate = user.lastPickDate ? new Date(user.lastPickDate) : null;
    if (lastPickDate && now - lastPickDate < 7 * 24 * 60 * 60 * 1000) {
      return res.status(400).send({ success: false, message: 'You can only pick one team per week.' });
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
// Admin Login
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  // Basic admin username and password for authentication
  if (username === 'admin' && password === 'password') {
    res.redirect('/admin'); // Redirect to admin panel
  } else {
    res.status(401).send('Invalid admin credentials.');
  }
});
// Fetch all users for admin
app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username'); // Fetch only the username field
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching users.');
  }
});

// Admin Routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Delete a user
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

// Update user points
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

// Unlock all teams for a user
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

// Unlock all teams for all users
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
async function scrapeAndCacheNFLGames() {
  try {
    const url = 'https://www.pro-football-reference.com/boxscores/';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    console.log('Scraper fetched data successfully.');

    const currentDate = new Date();
    const games = [];

    $('table#games tbody tr').each((i, el) => {
      const teamName = $(el).find('td[data-stat="team"]').text(); // Adjust selector
      const gameTime = $(el).find('td[data-stat="time"]').text(); // Adjust selector

      console.log(`Team: ${teamName}, Game Time: ${gameTime}`);

      const gameStatus = gameTime.includes('Live') ? 'live' : 
                         currentDate > new Date(gameTime) ? 'completed' : 'not started';

      if (teamName) {
        games.push({
          teamName,
          gameStatus,
        });
      }
    });

    cachedTeamsWithStatus = games;
    console.log('Cached Teams with Status:', cachedTeamsWithStatus);
  } catch (error) {
    console.error('Error scraping NFL games:', error.message);
  }
}


app.get('/nfl-teams', (req, res) => {
  if (cachedTeamsWithStatus.length === 0) {
    return res.status(503).send('NFL game data is not available yet. Please try again later.');
  }
  res.json(cachedTeamsWithStatus);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

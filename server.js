// Existing imports
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
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
  winningTeam: String, // Store the winning team
});

const Game = mongoose.model('Game', gameSchema);

// Function to fetch and update game results
async function updateGameResults() {
  try {
    // Replace with your NFL API endpoint
    const response = await axios.get('https://nfl-api-data.p.rapidapi.com/nfl-team-listing/v1/data', {
      headers: {
        'X-RapidAPI-Key': '10bf18f0demshb31eaae24d15703p127820jsn83bb8d8273b6', // Your API key
        'X-RapidAPI-Host': 'nfl-api-data.p.rapidapi.com',
      },
    });

    const gameResults = response.data; // Adjust based on API response structure
    for (const game of gameResults) {
      if (game.status === 'finished') {
        const winningTeam = game.winningTeam; // Replace with actual key from API response
        const users = await User.find({ selectedTeam: winningTeam });

        for (const user of users) {
          user.points += 1; // Increment points for the win
          user.selectedTeam = null; // Reset selected team for the next week
          await user.save();
        }
      }
    }
    console.log('Game results updated successfully.');
  } catch (error) {
    console.error('Error updating game results:', error);
  }
}

// Route to manually trigger game results update
app.get('/update-game-results', async (req, res) => {
  try {
    await updateGameResults();
    res.send('Game results updated successfully.');
  } catch (error) {
    res.status(500).send('Error updating game results.');
  }
});

// Scheduled task to update game results every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled game results update...');
  await updateGameResults();
});

// Existing routes (no changes made)
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

    req.session.username = username; // Set username in session
    res.redirect('/teams'); // Redirect to the team selection page
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
    const users = await User.find({}, 'username selectedTeam points').sort({ points: -1 }); // Sort by points (descending)
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

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

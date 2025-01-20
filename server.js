const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000; // Use Render's PORT variable

// MongoDB connection
mongoose.connect(
  "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority&appName=mikes-sports0new",
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  selectedTeam: { type: String, default: null },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const scheduleSchema = new mongoose.Schema({
  team: { type: String, required: true },
  gameTime: { type: Date, required: true },
  completed: { type: Boolean, default: false }
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

// Routes

// Root Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the registration page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Serve the team selection page
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

// Serve the admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve the leaderboard page
app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
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

    res.status(200).send('Login successful');
  } catch (error) {
    res.status(500).send('Error logging in.');
  }
});

// Get all teams
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await Schedule.find();
    const currentTime = new Date();

    const updatedTeams = teams.map(team => {
      const gameStartTime = new Date(team.gameTime);
      const gameEndTime = new Date(gameStartTime.getTime() + 3 * 60 * 60 * 1000);

      return {
        ...team._doc,
        status: currentTime >= gameStartTime && currentTime <= gameEndTime ? 'glowing' : currentTime > gameEndTime ? 'greyed out' : 'normal'
      };
    });

    res.json(updatedTeams);
  } catch (error) {
    res.status(500).send('Error fetching teams.');
  }
});

// Select a team
app.post('/api/select-team', async (req, res) => {
  const { username, team } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    const teamData = await Schedule.findOne({ team });
    if (!teamData) {
      return res.status(404).send('Team not found.');
    }

    const currentTime = new Date();
    if (currentTime > new Date(teamData.gameTime)) {
      return res.status(400).send('Cannot select a team after the game has started.');
    }

    user.selectedTeam = team;
    await user.save();
    res.status(200).send('Team selected successfully!');
  } catch (error) {
    res.status(500).send('Error selecting team.');
  }
});

// Admin: Set game result
app.post('/api/admin/set-result', async (req, res) => {
  const { team, completed } = req.body;

  try {
    const game = await Schedule.findOne({ team });
    if (!game) {
      return res.status(404).send('Game not found.');
    }

    game.completed = completed;
    await game.save();
    res.status(200).send('Game result updated successfully!');
  } catch (error) {
    res.status(500).send('Error updating game result.');
  }
});

// Admin: Update points
app.post('/api/admin/update-points', async (req, res) => {
  const { team } = req.body;

  try {
    const users = await User.find({ selectedTeam: team });
    for (const user of users) {
      user.points += 1;
      user.selectedTeam = null; // Reset team selection
      await user.save();
    }

    res.status(200).send('Points updated successfully!');
  } catch (error) {
    res.status(500).send('Error updating points.');
  }
});

// Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await User.find().sort({ points: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).send('Error fetching leaderboard.');
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

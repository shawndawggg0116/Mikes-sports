const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const moment = require('moment-timezone'); // Include moment-timezone

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const mongoUri = 'mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority&appName=mikes-sports0new';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// JWT Secret
const JWT_SECRET = 'your_secret_key'; // Replace with your secure key

// MongoDB Schemas and Models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pickedTeams: { type: [String], default: [] },
  lastPickDate: { type: Date, default: null }
});
const User = mongoose.model('User', UserSchema, 'users');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// User Registration
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});



// Fetch all teams with their statuses
app.get('/api/teams', authenticateToken, async (req, res) => {
  try {
    const teamsCollection = mongoose.connection.db.collection('teams');
    const gamesCollection = mongoose.connection.db.collection('games');

    const allTeams = await teamsCollection.find().toArray();
    const currentGames = await gamesCollection.find().toArray();

    const mergedTeams = allTeams.map((team) => {
      const game = currentGames.find(
        (g) => g.homeTeam === team.name || g.awayTeam === team.name
      );

      if (game) {
        const now = moment().tz('America/New_York'); // Current time in EST
        const startTime = moment.tz(game.startTime, 'America/New_York'); // Game start time in EST
        const endTime = moment.tz(game.endTime, 'America/New_York'); // Game end time in EST

        const gameStatus =
          now.isBetween(startTime, endTime)
            ? "Playing"
            : now.isAfter(endTime)
            ? "Completed"
            : "Scheduled";

        return {
          ...team,
          status: gameStatus,
          opponent: game.homeTeam === team.name ? game.awayTeam : game.homeTeam,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        };
      }
      return { ...team, status: 'Available' };
    });

    res.json(mergedTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).send('Error fetching teams');
  }
});

// Serve the main page for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the teams page for the /teams route
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

// Catch-all route to handle unmatched routes
async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
  });

  const result = await response.json();

  if (response.ok) {
      localStorage.setItem('token', result.token);
      localStorage.setItem('role', result.role.toLowerCase()); // Convert role to lowercase

      if (result.role.toLowerCase() === 'admin') {
          window.location.href = '/admin'; // Redirect admin users to /admin
      } else {
          window.location.href = '/teams'; // Redirect normal users to /teams
      }
  } else {
      alert(result.message);
  }
}



app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});



// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

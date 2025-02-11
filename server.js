require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const moment = require('moment-timezone'); // Include moment-timezone

const app = express();

// Middleware to authenticate API key
function authenticateAPIKey(req, res, next) {
    const apiKeyReceived = req.headers['x-rapidapi-key'];
    const validApiKey = "Your_valid_API_key"; // Your valid API key

    if (apiKeyReceived === validApiKey) {
        next(); // Proceed to the next middleware/function if the API key is valid
    } else {
        res.status(401).json({ error: "Unauthorized access: Invalid API key" });
    }
}

// Middleware
app.use(bodyParser.json());
app.use(cors());

app.use(express.static(__dirname));
app.use(express.static('public'));

// MongoDB connection
const JWT_SECRET = process.env.JWT_SECRET;  // Use the secret key from the environment variable
const mongoUri = process.env.MONGO_URI;     // Use the MongoDB URI from the environment variable

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schemas and Models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  picks: [{ week: Number, team: String, result: String }],
  totalScore: { type: Number, default: 0 },
  lastPickDate: { type: Date, default: null }
});
const User = mongoose.model('User', UserSchema, 'users');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
app.get('/api/get-user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      username: user.username,
      picks: user.picks,
      totalScore: user.totalScore
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/pick-team', authenticateToken, async (req, res) => {
  try {
    const { week, team } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const existingPick = user.picks.find(pick => pick.week === week);
    if (existingPick) {
      return res.status(400).json({ success: false, message: 'You already picked a team for this week' });
    }

    user.picks.push({ week, team, result: 'pending' });
    user.lastPickDate = new Date();
    await user.save();

    res.json({ success: true, message: `Pick for Week ${week} saved!`, picks: user.picks });
  } catch (error) {
    console.error('Error selecting team:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/get-leaderboard', async (req, res) => {
  try {
    const users = await User.find({}, 'username picks totalScore').lean();

    const leaderboard = users.map(user => ({
      username: user.username,
      picks: user.picks,
      totalScore: user.totalScore
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to fetch user-specific data
app.get('/api/user-data', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      username: user.username,
      pickedTeams: user.pickedTeams
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

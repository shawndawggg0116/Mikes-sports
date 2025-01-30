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
  selectedTeam: { type: String, default: null },
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

// User Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch user picks
app.get('/api/user-picks', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      pickedTeams: user.pickedTeams,
      selectedTeam: user.selectedTeam,
    });
  } catch (error) {
    console.error('Error fetching user picks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Select a team
app.post('/api/select-team', authenticateToken, async (req, res) => {
  const { team } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.pickedTeams.includes(team)) {
      return res.status(400).json({ message: 'Team already picked' });
    }
    user.selectedTeam = team;
    await user.save();
    res.json({ message: 'Team selected successfully!' });
  } catch (error) {
    console.error('Error selecting team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit a pick
app.post('/api/submit-pick', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.selectedTeam) {
      return res.status(400).json({ message: 'No team selected' });
    }

    user.pickedTeams.push(user.selectedTeam);
    user.selectedTeam = null;
    user.lastPickDate = new Date();
    await user.save();

    res.json({ message: 'Pick submitted successfully!' });
  } catch (error) {
    console.error('Error submitting pick:', error);
    res.status(500).json({ message: 'Server error' });
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
app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your_secret_key'; // Replace with a secure key

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const mongoUri = 'mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority&appName=mikes-sports0new';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pickedTeams: { type: [String], default: [] },
  lastPickDate: { type: Date, default: null }
});
const User = mongoose.model('User', UserSchema, 'users');

// Utility function to convert UTC to EST
function convertUTCToEST(date) {
  const utcDate = new Date(date);
  const estOffset = -5 * 60;
  return new Date(utcDate.getTime() + estOffset * 60000);
}

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

// Fetch all teams
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
        const now = new Date();
        const startTime = convertUTCToEST(game.startTime);
        const endTime = convertUTCToEST(game.endTime);
        const gameStatus =
          now >= startTime && now <= endTime
            ? 'Playing'
            : now > endTime
            ? 'Completed'
            : 'Scheduled';

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

// Save picked team
app.post('/api/pick-team', authenticateToken, async (req, res) => {
  const { team } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).send({ success: false, message: 'User not found' });
    if (user.pickedTeams.includes(team)) return res.status(400).send({ success: false, message: 'Team already picked' });
    user.pickedTeams.push(team);
    user.lastPickDate = new Date();
    await user.save();
    res.send({ success: true });
  } catch (error) {
    console.error('Error saving picked team:', error);
    res.status(500).send({ success: false, message: 'Error saving picked team' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

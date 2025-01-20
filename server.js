// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

// Initialize the app
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your-secure-secret';

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect(
  'mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority',
  { useNewUrlParser: true, useUnifiedTopology: true }
)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  points: { type: Number, default: 0 },
  selectedTeam: { type: String, default: null },
  lastPickDate: { type: Date, default: null }
});
const User = mongoose.model('User', UserSchema);

const ScheduleSchema = new mongoose.Schema({
  team: { type: String, required: true },
  gameTime: { type: Date, required: true },
  completed: { type: Boolean, default: false }
});
const Schedule = mongoose.model('Schedule', ScheduleSchema);

// User registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing username or password');

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword });
  try {
    await newUser.save();
    res.status(201).send('User registered successfully');
  } catch (err) {
    res.status(400).send('Error registering user: ' + err.message);
  }
});

// User login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing username or password');

  const user = await User.findOne({ username });
  if (!user) return res.status(404).send('User not found');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).send('Invalid credentials');

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
});

// Middleware to authenticate requests
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Access denied');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).send('Invalid token');
  }
}

// Get all teams (with game statuses)
app.get('/teams', authenticate, async (req, res) => {
  const teams = await Schedule.find();

  const currentTime = new Date();
  const updatedTeams = teams.map(team => {
    const gameStartTime = new Date(team.gameTime);
    const gameEndTime = new Date(gameStartTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours after game start

    return {
      ...team._doc,
      status: currentTime >= gameStartTime && currentTime <= gameEndTime ? 'glowing' : currentTime > gameEndTime ? 'greyed out' : 'normal'
    };
  });

  res.json(updatedTeams);
});

// Admin-only route to update game results
app.post('/admin/update-game', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');

  const { team, completed } = req.body;
  try {
    await Schedule.updateOne({ team }, { completed });
    res.send('Game updated');
  } catch (err) {
    res.status(400).send('Error updating game: ' + err.message);
  }
});

// Admin-only route to manage users
app.delete('/admin/delete-user/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');

  try {
    await User.findByIdAndDelete(req.params.id);
    res.send('User deleted');
  } catch (err) {
    res.status(400).send('Error deleting user: ' + err.message);
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

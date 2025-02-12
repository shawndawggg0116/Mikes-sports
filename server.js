require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const moment = require('moment-timezone');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// WebSocket logic
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('chat message', (msg) => io.emit('chat message', msg));
  socket.on('disconnect', () => console.log('User disconnected'));
});

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname));
app.use(express.static('public'));

// MongoDB connection
const JWT_SECRET = process.env.JWT_SECRET;
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// MongoDB User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  createdAt: { type: Date, default: Date.now },
  lastPickDate: { type: Date, default: null },
  picks: { type: Object, default: {} },
  totalScore: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema, 'users');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
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
    console.error('❌ Error registering user:', error);
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
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch user data
app.get('/api/get-user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ username: user.username, picks: user.picks, totalScore: user.totalScore });
  } catch (error) {
    console.error('❌ Error fetching user data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to pick an NFL team
app.post('/api/pick-team', async (req, res) => {
  const { username, team } = req.body; // Ensure you have appropriate authentication to get username

  try {
    await db.collection('users').updateOne(
      { username: username },
      { $push: { picks: { team: team, result: 'pending' } } } // Assuming a structure for `picks`
    );
    res.json({ success: true, message: 'Team picked successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to pick team' });
  }
});


// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the teams page
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

// Catch-all route for unmatched routes
app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

// Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

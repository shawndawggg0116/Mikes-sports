const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
  .then(() => console.log('Connected to MongoDB'))
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
  pickedTeams: [{ team: String, week: Number }],
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Game schema
const gameSchema = new mongoose.Schema({
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date }, 
  status: { type: String, enum: ['upcoming', 'in_progress', 'finished'], default: 'upcoming' }
});

const Game = mongoose.model('Game', gameSchema);

// Routes

// Register
app.post('/register', async (req, res) => {
  // ... (Your existing registration logic)
});

// Login
app.post('/login', async (req, res) => {
  // ... (Your existing login logic)
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Get logged-in user
app.get('/get-logged-in-user', (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user.username });
  } else {
    res.status(401).send({ error: 'User not logged in' });
  }
});

// Get picked teams
app.get('/get-picked-teams', async (req, res) => {
  // ... (Your existing logic to fetch picked teams)
});

// Get available teams
app.get('/get-available-teams', async (req, res) => {
  try {
    const allGames = await Game.find().select('homeTeam awayTeam startTime endTime status'); 
    res.send({ success: true, games: allGames }); 
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status(500).send({ success: false, message: 'Error fetching available teams.' });
  }
});

// Handle team selection
app.post('/select-team', async (req, res) => {
  // ... (Your existing logic to handle team selection)
});

// ... (Other routes: leaderboard, rules, etc.)

// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected');

  emitGameStatusUpdates(socket);

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const emitGameStatusUpdates = async (socket) => {
  // ... (Your existing game status update logic)
};

// Start the server
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
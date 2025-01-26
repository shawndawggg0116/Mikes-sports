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

// Replace with your actual MongoDB URI and credentials (avoid storing them in plain code)
const mongoURI = "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority";

// MongoDB connection
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'your-strong-secret-key', // Replace with a long, random secret key
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
  const { username, password } = req.body;

  // ... (Your existing logic to validate username and password)

  if (isValidLogin(username, password)) { // Replace with your validation logic
    req.session.user = user; // Store user object in session
    res.redirect('/teams'); // Redirect to /teams after successful login
  } else {
    // Handle login failure (e.g., display error message)
    res.status(401).send({ error: 'Invalid username or password' });
  }
});

// Logout
// ... (Your existing logout logic)

// Check if user is logged in
// ... (Your existing isLoggedIn function)

// Get logged-in user
// ... (Your existing get-logged-in-user route)

// ... (Other routes)

// Socket.IO
// ... (Your existing Socket.IO logic)

// Start the server
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
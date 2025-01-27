// Required Node.js modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const http = require('http');
const path = require('path');
const bcrypt = require('bcrypt');

// Initialize Express app and server
const app = express();
const server = http.createServer(app);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a secure secret key
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// MongoDB connection
const mongoUri = "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority&appName=mikes-sports0new";
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected to nfl-picks-app database'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schemas and Models
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  pickedTeams: [String],
  lastPickDate: Date
});

const ScheduleSchema = new mongoose.Schema({
  homeTeam: String,
  awayTeam: String,
  startTime: Date,
  endTime: Date,
  status: String
});

const User = mongoose.model('User', UserSchema, 'users');
const Schedule = mongoose.model('Schedule', ScheduleSchema);

// Routes
// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send({ success: false, message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({ success: false, message: 'Invalid credentials' });
    }
    req.session.username = username;
    res.status(200).send({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

// Fetch user teams endpoint
app.get('/api/user-teams', async (req, res) => {
  const username = req.session.username;
  if (!username) {
    return res.status(401).send({ success: false, message: 'User not logged in' });
  }
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(404).send({ success: false, message: 'User not found' });
  }
  res.send({ pickedTeams: user.pickedTeams });
});

// Save picked team endpoint
app.post('/api/pick-team', async (req, res) => {
  const username = req.session.username;
  const { team } = req.body;
  const user = await User.findOne({ username });

  if (!user || user.pickedTeams.includes(team)) {
    return res.status(400).send({ success: false, message: 'Team already picked or user not found' });
  }

  user.pickedTeams.push(team);
  user.lastPickDate = new Date();
  await user.save();
  res.send({ success: true });
});

// Serve teams.html
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

// Wildcard route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add this inside your `io.on('connection')` block to listen for and handle socket events
io.on('connection', (socket) => {
  console.log('A user connected');

  // Emit current teams data when a user connects
  socket.emit('teams', async () => {
      const teams = await Schedule.find();
      return teams;
  });

  // Listen for team pick event
  socket.on('pick-team', async (data) => {
      const { username, team } = data;
      try {
          const user = await User.findOne({ username });

          if (!user || user.pickedTeams.includes(team)) {
              socket.emit('error', 'Team already picked or user not found.');
              return;
          }

          user.pickedTeams.push(team);
          user.lastPickDate = new Date();
          await user.save();

          // Notify all clients about the update
          io.emit('team-updated', { team, username });
      } catch (error) {
          console.error(error);
          socket.emit('error', 'Failed to pick the team. Please try again.');
      }
  });

  socket.on('disconnect', () => {
      console.log('A user disconnected');
  });
});


// Server listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

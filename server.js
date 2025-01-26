// Required Node.js modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');
const http = require('http');
const path = require('path');
const bcrypt = require('bcrypt');

// Initialize Express app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send({ success: false, message: 'Invalid credentials' });
    }

    // Compare the hashed password with the provided password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send({ success: false, message: 'Invalid credentials' });
    }

    // Successful login
    res.status(200).send({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

// Fetch teams endpoint
app.get('/api/teams', async (req, res) => {
  const schedules = await Schedule.find();
  res.send(schedules);
});

// Save picked team endpoint
app.post('/api/pick-team', async (req, res) => {
  const { username, team } = req.body;
  const user = await User.findOne({ username });

  if (!user || user.pickedTeams.includes(team)) {
    return res.status(400).send({ success: false, message: 'Team already picked or user not found' });
  }

  user.pickedTeams.push(team);
  user.lastPickDate = new Date();
  await user.save();
  res.send({ success: true });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const bcrypt = require('bcrypt');

// Register endpoint
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Check if the username is already taken
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send({ success: false, message: 'Username already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create and save the new user
        const newUser = new User({
            username,
            password: hashedPassword,
            pickedTeams: [],
            lastPickDate: null,
        });
        await newUser.save();

        res.status(201).send({ success: true });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).send({ success: false, message: 'Server error' });
    }
});

// Serve register.html
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Server listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

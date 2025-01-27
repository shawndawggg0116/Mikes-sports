// Required Node.js modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const http = require('http');
const path = require('path');

// Initialize Express app and server
const app = express();
const server = http.createServer(app);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const mongoUri = "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/?retryWrites=true&w=majority&appName=mikes-sports0new";
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected to nfl-picks-app database'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schemas and Models
const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  pickedTeams: [String],
  lastPickDate: Date,
});

const ScheduleSchema = new mongoose.Schema({
  homeTeam: String,
  awayTeam: String,
  startTime: Date,
  endTime: Date,
  status: String,
});

const User = mongoose.model('User', UserSchema, 'users');
const Schedule = mongoose.model('Schedule', ScheduleSchema, 'games');

// Routes
// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log(`Login attempt: Username: ${username}`);

    // Check if the user exists in the database
    const user = await User.findOne({ username });
    if (!user) {
      console.error(`User not found: ${username}`);
      return res.status(401).send({ success: false, message: 'Invalid credentials' });
    }

    console.log(`User found: ${user.username}`);

    // Compare the provided password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error(`Password mismatch for user: ${username}`);
      return res.status(401).send({ success: false, message: 'Invalid credentials' });
    }

    console.log(`Login successful for user: ${username}`);
    res.status(200).send({ success: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

// Fetch schedules endpoint
app.get('/api/teams', async (req, res) => {
  try {
    const schedules = await Schedule.find();
    res.send(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

// Save picked team endpoint
app.post('/api/pick-team', async (req, res) => {
  const { username, team } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user || user.pickedTeams.includes(team)) {
      return res.status(400).send({ success: false, message: 'Team already picked or user not found' });
    }

    user.pickedTeams.push(team);
    user.lastPickDate = new Date();
    await user.save();
    res.send({ success: true });
  } catch (error) {
    console.error('Error saving picked team:', error);
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

// Serve static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

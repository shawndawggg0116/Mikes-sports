// Required Node.js modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');
const http = require('http');
const path = require('path');

// Initialize Express app and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const mongoUri = "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/?retryWrites=true&w=majority&appName=mikes-sports0new";
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
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

const User = mongoose.model('User', UserSchema);
const Schedule = mongoose.model('Schedule', ScheduleSchema);

// Routes
// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send('Invalid credentials.');
    }

    req.session.username = username; // Set username in session
    res.redirect('/teams'); // Redirect to the team selection page
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Error logging in.');
  }
});

// Fetch logged-in username
app.get('/get-logged-in-user', (req, res) => {
  if (!req.session || !req.session.username) {
    return res.status(401).send({ error: 'User not logged in' });
  }
  res.send({ username: req.session.username });
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

// Server listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

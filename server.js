// Required imports
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
const cron = require('node-cron');
const MongoStore = require('connect-mongo');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  })
);

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  selectedTeam: { type: String, default: null },
  pickedTeams: { type: [String], default: [] },
  lastPickDate: { type: Date, default: null },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Game schema
const gameSchema = new mongoose.Schema({
  gameId: String,
  week: Number,
  team1: String,
  team2: String,
  startTime: Date,
  endTime: Date,
  status: { type: String, enum: ['scheduled', 'in-progress', 'finished'], default: 'scheduled' },
  winningTeam: { type: String, default: null },
});

const Game = mongoose.model('Game', gameSchema);

// Function to fetch and update game results
async function updateGameResults() {
  try {
    const response = await axios.get('https://nfl-api-data.p.rapidapi.com/nfl-team-listing/v1/data', {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'nfl-api-data.p.rapidapi.com',
      },
    });

    const gameResults = response.data; // Adjust based on API response structure
    for (const game of gameResults) {
      if (game.status === 'finished') {
        const winningTeam = game.winningTeam; // Replace with actual key from API response
        const users = await User.find({ selectedTeam: winningTeam });

        for (const user of users) {
          user.points += 1; // Increment points for the win
          user.selectedTeam = null; // Reset selected team for the next week
          await user.save();
        }
      }
    }
    console.log('Game results updated successfully.');
  } catch (error) {
    console.error('Error updating game results:', error);
  }
}

// Route to manually trigger game results update
app.get('/update-game-results', async (req, res) => {
  try {
    await updateGameResults();
    res.send('Game results updated successfully.');
  } catch (error) {
    res.status(500).send('Error updating game results.');
  }
});

// Route to fetch the NFL schedule
app.get('/api/nfl-schedule', async (req, res) => {
  try {
    const games = await Game.find().sort({ week: 1, startTime: 1 });
    res.json(games);
  } catch (error) {
    console.error('Error fetching NFL schedule:', error);
    res.status(500).send('Error fetching NFL schedule.');
  }
});

// Route to fetch available teams
app.get('/available-teams', async (req, res) => {
  try {
    const now = new Date();
    const games = await Game.find({ startTime: { $gt: now } });
    const availableTeams = games.flatMap((game) => [game.team1, game.team2]);
    res.json(availableTeams);
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status(500).send('Error fetching available teams.');
  }
});

// Scheduled task to update game results every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled game results update...');
  await updateGameResults();
});

// Routes for serving static HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// User registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send('Username already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).send('User registered successfully!');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user.');
  }
});

// User login
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

    req.session.username = username;
    res.redirect('/teams');
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Error logging in.');
  }
});

// Fetch logged-in user
app.get('/get-logged-in-user', (req, res) => {
  if (!req.session || !req.session.username) {
    return res.status(401).send({ error: 'User not logged in' });
  }
  res.send({ username: req.session.username });
});

// Admin login
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.status(401).send('Invalid admin credentials.');
});

// Admin page
app.get('/admin', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).send('Access denied.');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fetch and store NFL schedule
async function fetchAndStoreSchedule() {
  try {
    const response = await axios.get('https://nfl-api-data.p.rapidapi.com/nfl-team-listing/v1/data', {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'nfl-api-data.p.rapidapi.com',
      },
    });

    const schedule = response.data.map((game) => ({
      gameId: game.team.id,
      team1: game.team.displayName,
      team2: game.team.nickname,
      startTime: new Date(),
      endTime: new Date(),
      status: 'scheduled',
    }));

    await Game.insertMany(schedule);
    console.log('Schedule saved successfully.');
  } catch (error) {
    console.error('Error fetching or saving schedule:', error.message);
  }
}

app.get('/fetch-schedule', async (req, res) => {
  try {
    await fetchAndStoreSchedule();
    res.send('NFL schedule fetched and stored successfully!');
  } catch (error) {
    res.status(500).send('Error fetching and storing NFL schedule.');
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

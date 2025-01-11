const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
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
  selectedTeam: { type: String, default: null },
  pickedTeams: { type: [String], default: [] },
  lastPickDate: { type: Date, default: null },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Define Game schema
const gameSchema = new mongoose.Schema({
  gameId: String,
  week: Number,
  team1: String,
  team2: String,
  startTime: Date,
  endTime: Date,
  status: String, // "scheduled", "in-progress", or "finished"
});

const Game = mongoose.model('Game', gameSchema);

// Function to fetch and store NFL schedule
async function fetchAndStoreSchedule() {
  try {
    const response = await axios.get('https://api.balldontlie.io/v1/nfl/schedules', {
      headers: { 'Authorization': '1384160c-0e89-4e67-a763-23f51b996df9' },
    });

    const schedule = response.data.map(game => ({
      gameId: game.id,
      week: game.week,
      team1: game.home_team.abbreviation,
      team2: game.visitor_team.abbreviation,
      startTime: new Date(game.date),
      endTime: new Date(new Date(game.date).getTime() + 3 * 60 * 60 * 1000), // Approximate 3-hour duration
      status: 'scheduled',
    }));

    await Game.insertMany(schedule);
    console.log('NFL schedule successfully stored.');
  } catch (error) {
    console.error('Error fetching schedule:', error);
  }
}

// Routes for fetching NFL schedule and teams
app.get('/fetch-schedule', async (req, res) => {
  try {
    await fetchAndStoreSchedule();
    res.send('NFL schedule fetched and stored successfully!');
  } catch (error) {
    res.status(500).send('Error fetching schedule.');
  }
});

app.get('/available-teams', async (req, res) => {
  const now = new Date();
  try {
    const games = await Game.find({ startTime: { $gt: now } }); // Get games that haven't started
    const availableTeams = games.flatMap(game => [game.team1, game.team2]);
    res.json(availableTeams);
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status(500).send('Error fetching available teams.');
  }
});

// Serve the NFL Schedule HTML page
app.get('/schedule', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'schedule.html'));
});

// API route to fetch the NFL schedule data
app.get('/api/nfl-schedule', async (req, res) => {
  try {
    const games = await Game.find().sort({ week: 1, startTime: 1 }); // Sort games by week and start time
    res.json(games);
  } catch (error) {
    console.error('Error fetching NFL schedule:', error);
    res.status(500).send('Error fetching NFL schedule.');
  }
});

// Existing routes for login, registration, team selection, leaderboard, admin, etc.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

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

app.get('/get-logged-in-user', (req, res) => {
  if (!req.session || !req.session.username) {
    return res.status(401).send({ error: 'User not logged in' });
  }
  res.send({ username: req.session.username });
});

app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

app.get('/rules', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rules.html'));
});

app.get('/get-picked-teams', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).send({ success: false, message: 'Username is required.' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ success: false, message: 'User not found.' });
    }

    res.send({ success: true, pickedTeams: user.pickedTeams });
  } catch (error) {
    console.error('Error fetching picked teams:', error);
    res.status(500).send({ success: false, message: 'Error fetching picked teams.' });
  }
});

app.get('/get-leaderboard', async (req, res) => {
  try {
    const users = await User.find({}, 'username selectedTeam points').sort({ points: -1 }); // Sort by points (descending)
    res.json(users);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).send('Error fetching leaderboard.');
  }
});

app.post('/select-team', async (req, res) => {
  const { username, team } = req.body;

  if (!username || !team) {
    return res.status(400).send({ success: false, message: 'Username and team are required.' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send({ success: false, message: 'User not found.' });
    }

    if (user.pickedTeams.includes(team)) {
      return res.status(400).send({ success: false, message: 'You already picked this team.' });
    }

    const now = new Date();
    const lastPickDate = user.lastPickDate ? new Date(user.lastPickDate) : null;
    if (lastPickDate && now - lastPickDate < 7 * 24 * 60 * 60 * 1000) {
      return res.status(400).send({ success: false, message: 'You can only pick one team per week.' });
    }

    user.selectedTeam = team;
    user.pickedTeams.push(team);
    user.lastPickDate = now;
    await user.save();

    res.send({ success: true, message: `You picked ${team}` });
  } catch (error) {
    console.error('Error selecting team:', error);
    res.status(500).send({ success: false, message: 'Error selecting team.' });
  }
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/admin-login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    if (username === 'admin' && password === 'password') {
      res.redirect('/admin'); // Redirect to admin dashboard
    } else {
      res.status(401).send('Invalid admin credentials.');
    }
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).send('Error during admin login.');
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching users.');
  }
});

app.post('/admin/update-points', async (req, res) => {
  const { username, points } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    user.points = points;
    await user.save();
    res.send('Points updated successfully!');
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).send('Error updating points.');
  }
});

app.post('/admin/unlock-teams', async (req, res) => {
  const { username } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    user.pickedTeams = [];
    await user.save();
    res.send('Teams unlocked successfully!');
  } catch (error) {
    console.error('Error unlocking teams:', error);
    res.status(500).send('Error unlocking teams.');
  }
});

app.post('/admin/delete-user', async (req, res) => {
  const { username } = req.body;

  try {
    await User.deleteOne({ username });
    res.send('User deleted successfully!');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send('Error deleting user.');
  }
});
// Function to fetch and store NFL teams from RapidAPI
async function fetchAndStoreNFLTeams() {
  try {
    const response = await axios.get('https://nfl-api-data.p.rapidapi.com/nfl-team-listing/v1/data', {
      headers: {
        'x-rapidapi-host': 'nfl-api-data.p.rapidapi.com',
        'x-rapidapi-key': '10bf18f0demshb31eaae24d15703p127820jsn83bb8d8273b', // Replace with your actual API key
      },
    });

    const teams = response.data.map(team => ({
      id: team.id,
      abbreviation: team.abbreviation,
      name: team.name,
      conference: team.conference,
      division: team.division,
    }));

    await Team.insertMany(teams, { ordered: false }); // Prevent duplication errors
    console.log('NFL teams successfully stored in MongoDB.');
  } catch (error) {
    console.error('Error fetching NFL teams:', error.response ? error.response.data : error.message);
  }
}
app.get('/fetch-teams', async (req, res) => {
  try {
    await fetchAndStoreNFLTeams();
    res.send('NFL teams fetched and stored successfully!');
  } catch (error) {
    res.status(500).send('Error fetching NFL teams.');
  }
});
app.get('/available-teams', async (req, res) => {
  try {
    const teams = await Team.find(); // Fetch all teams from the collection
    res.json(teams.map(team => team.team)); // Adjust if the field is nested
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).send('Error fetching teams.');
  }
});
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  id: String,
  abbreviation: String,
  name: String,
  conference: String,
  division: String,
});

const Team = mongoose.model('Team', teamSchema);
app.get('/available-teams', async (req, res) => {
  try {
    const teams = await Team.find(); // Adjust the query if needed
    res.json(teams); // Send the teams as JSON response
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status(500).send('Error fetching available teams.');
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

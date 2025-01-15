const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));


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

// Schedule schema
const scheduleSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  games: [
    {
      homeTeam: { type: String, required: true },
      awayTeam: { type: String, required: true },
      date: { type: String, required: true },
      time: { type: String, required: true },
      location: { type: String, required: true },
      status: { type: String, default: "Scheduled" },
      homeTeamScore: { type: Number, default: null },
      awayTeamScore: { type: Number, default: null },
    },
  ],
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

mongoose.connect(process.env.MONGO_URI, 
   {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000 // 30 seconds
});


// Routes

// Root Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the registration page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Register a user
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

// Login Route
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

// Serve the team selection page
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

// Serve the leaderboard page
app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

// Serve the rules page
app.get('/rules', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rules.html'));
});

// Fetch user's picked teams
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

// Get leaderboard data
app.get('/get-leaderboard', async (req, res) => {
  try {
    const users = await User.find({}, 'username selectedTeam points').sort({ points: -1 }); // Sort by points (descending)
    res.json(users);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).send('Error fetching leaderboard.');
  }
});

// Fetch schedule for a specific week
app.get('/schedules/:week', async (req, res) => {
  const { week } = req.params;

  try {
    const schedule = await Schedule.findOne({ week: parseInt(week) });
    if (!schedule) {
      return res.status(404).send({ success: false, message: 'Schedule not found.' });
    }

    res.send({ success: true, schedule });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).send('Error fetching schedule.');
  }
});


// Handle team selection
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

// Admin Routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin Login
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

// Fetch all users for admin
app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching users.');
  }
});

// Edit user points
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

// Unlock a user's picked teams
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

// Reset all users' weekly picks (admin-only)
app.post('/admin/reset-weekly-picks', async (req, res) => {
  try {
    await User.updateMany({}, { $set: { weeklyPicks: [], selectedTeam: null } });
    res.send('Weekly picks reset successfully!');
  } catch (error) {
    console.error('Error resetting weekly picks:', error);
    res.status(500).send('Error resetting weekly picks.');
  }
});

// Update game statuses dynamically
app.post('/admin/update-game-statuses', async (req, res) => {
  const now = new Date();

  try {
    const schedules = await Schedule.find();

    schedules.forEach(async (week) => {
      week.games.forEach((game) => {
        const gameTime = new Date(`${game.date}T${game.time}`);

        if (now >= gameTime && game.status === "Scheduled") {
          game.status = "Playing";
        } else if (now > gameTime.getTime() + 3 * 60 * 60 * 1000) { // Assume games last 3 hours
          game.status = "Completed";
        }
      });

      await week.save();
    });

    res.send('Game statuses updated successfully!');
  } catch (error) {
    console.error('Error updating game statuses:', error);
    res.status(500).send('Error updating game statuses.');
  }
});


// Delete a user
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

const cron = require('node-cron');

// Weekly reset every Tuesday at midnight
cron.schedule('0 0 * * 2', async () => {
  try {
    // Reset weekly picks
    await User.updateMany({}, { $set: { weeklyPicks: [], selectedTeam: null } });

    // Reset game statuses for the new week
    await Schedule.updateMany({}, { $set: { "games.$[].status": "Scheduled" } });

    console.log('Weekly reset completed!');
  } catch (error) {
    console.error('Error during weekly reset:', error);
  }
});


// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

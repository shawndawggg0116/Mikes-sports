import express from 'express';
import db from './db.js';
import Game from './models/Game.js';
 // Centralized MongoDB connection
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5000;

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
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model('User', userSchema);

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

const updateGameStatus = require('./update_game_status');

// Schedule game status updates
cron.schedule('*/15 * * * *', () => {
  console.log('Updating game statuses...');
  updateGameStatus();
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Define the Schedule schema and model if not already defined
const scheduleSchema = new mongoose.Schema({
  week: Number,
  games: [
    {
      homeTeam: String,
      awayTeam: String,
      startTime: Date,
    },
  ],
});

const Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);

// Add the /api/games endpoint
app.get('/api/games', async (req, res) => {
  try {
    const currentWeek = getCurrentWeek();
    console.log(`[DEBUG] Fetching schedules for week: ${currentWeek}`);
    
    const schedules = await Schedule.findOne({ week: currentWeek });
    if (!schedules) {
      console.warn(`[DEBUG] No schedules found for week: ${currentWeek}`);
      return res.status(404).json({ message: 'No schedules found for the current week.' });
    }
    
    console.log(`[DEBUG] Schedules retrieved: ${JSON.stringify(schedules)}`);
    res.json(schedules);
  } catch (error) {
    console.error(`[DEBUG] Error fetching schedules: ${error.message}`);
    res.status(500).json({ message: 'Error fetching schedules.' });
  }
});

// Function to determine the current week dynamically
function getCurrentWeek() {
  const seasonStartDate = new Date('2024-09-07T00:00:00Z'); // Adjusted for testing with a realistic start date
  const now = new Date();
  const diff = now - seasonStartDate;
  const week = Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
  console.log(`[DEBUG] Current week calculated: ${week}`);
  return week;
}

// Added functionality to fix game status updates and debugging logs
function getGameStatus(game) {
  const now = new Date();
  const startTime = new Date(game.startTime);
  const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // 3-hour duration

  if (now < startTime) return 'Upcoming';
  if (now >= startTime && now <= endTime) return 'Ongoing';
  return 'Completed';
}

app.get('/api/games', async (req, res) => {
  try {
    const games = await Game.find();
    const gamesWithStatus = games.map(game => ({
      ...game.toObject(),
      status: getGameStatus(game)
    }));
    console.log('Game statuses updated:', gamesWithStatus);
    res.json({ games: gamesWithStatus });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Importing moment-timezone for consistent timezone handling
const moment = require("moment-timezone");

// Function to update game statuses based on current time
async function updateGameStatuses() {
    try {
        const games = await Game.find(); // Fetch all games from the database
        const currentTime = moment().tz("America/New_York"); // Current time in EST

        for (const game of games) {
            const gameStartTime = moment(game.startTime).tz("America/New_York"); // Game start time
            const gameEndTime = gameStartTime.clone().add(3, "hours"); // Game end time (3-hour duration)

            // Determine the game status
            if (currentTime.isBefore(gameStartTime)) {
                game.status = "Upcoming";
            } else if (currentTime.isBetween(gameStartTime, gameEndTime)) {
                game.status = "Ongoing";
            } else if (currentTime.isAfter(gameEndTime)) {
                game.status = "Completed";
            }

            await game.save(); // Save the updated game status
        }

        console.log("Game statuses updated successfully.");
    } catch (error) {
        console.error("Error updating game statuses:", error);
    }
}

// Schedule the updateGameStatuses function to run every 60 seconds
setInterval(updateGameStatuses, 60000);

{
    const currentTime = new Date(); // Ensure this is in UTC
    try {
        const games = await Game.find(); // Fetch all games
        for (const game of games) {
            const startTimeUTC = new Date(game.startTime); // Convert to UTC
            const endTimeUTC = new Date(game.endTime); // Convert to UTC

            let newStatus = '';
            if (startTimeUTC > currentTime) {
                newStatus = 'Upcoming';
            } else if (startTimeUTC <= currentTime && endTimeUTC > currentTime) {
                newStatus = 'Ongoing';
            } else if (endTimeUTC <= currentTime) {
                newStatus = 'Completed';
            }

            if (game.status !== newStatus) {
                console.log(`Updating game ID ${game._id}: ${game.status} -> ${newStatus}`);
                game.status = newStatus;
                await game.save();
            }
        }
    } catch (error) {
        console.error('Error updating game statuses:', error);
    }
};

// Schedule status updates to run every minute
setInterval(updateGameStatuses, 60000);

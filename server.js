require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const moment = require('moment-timezone'); // Include moment-timezone
const http = require('http'); // ✅ Make sure to require 'http' BEFORE using it
const { Server } = require('socket.io'); // ✅ Import Socket.io

const app = express();
const server = http.createServer(app); // ✅ Define the HTTP server correctly
const io = new Server(server); // ✅ Attach Socket.io to the server


// server.js (relevant part)
app.use(express.static(path.join(__dirname, 'public')));

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

const admin = require("firebase-admin");

// Initialize Firebase Admin SDK for Server
const serviceAccount = require("./firebase-service-account.json"); // Make sure this file exists

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

// Send a Test Notification Function
async function sendTestNotification() {
    const token = "PASTE_YOUR_FCM_TOKEN_HERE"; // Replace with the real token

    const message = {
        notification: {
            title: "🏈 NFL Picks Notification!",
            body: "This is a test push notification from the NFL Picks App.",
        },
        token: token,
    };

    messaging.send(message)
        .then(response => console.log("✅ Notification Sent:", response))
        .catch(error => console.error("❌ Error sending notification:", error));
}

sendTestNotification();



// WebSocket logic
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('chat message', (msg) => {
      io.emit('chat message', msg); // Broadcast message to all users
  });

  socket.on('disconnect', () => {
      console.log('User disconnected');
  });
});




// Middleware to authenticate API key
function authenticateAPIKey(req, res, next) {
    const apiKeyReceived = req.headers['x-rapidapi-key'];
    const validApiKey = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3OGZiMjYxYmU3MTcwYzFkNTUwNzk3ZiIsInVzZXJuYW1lIjoic2hhd24xIiwiaWF0IjoxNzM4OTY5OTE2LCJleHAiOjE3Mzg5NzM1MTZ9.vMpwVAo94u7bPS03H1EVigP0JEiCXXGYNa69fliX4NE"; // Your valid API key

    if (apiKeyReceived === validApiKey) {
        next(); // Proceed to the next middleware/function if the API key is valid
    } else {
        res.status(401).json({ error: "Unauthorized access: Invalid API key" });
    }
}

// Middleware
app.use(bodyParser.json());
app.use(cors());

app.use(express.static(__dirname));

app.use(express.static('public'));



// Routes
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

// Route for the Leaderboard page
app.get('/leaderboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

// Route for the Rules page
app.get('/rules', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'rules.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});



// MongoDB connection
const JWT_SECRET = process.env.JWT_SECRET;  // Use the secret key from the environment variable
const mongoUri = process.env.MONGO_URI;     // Use the MongoDB URI from the environment variable

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schemas and Models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  createdAt: { type: Date, default: Date.now },
  lastPickDate: { type: Date, default: null },
  
  // ✅ Picks stored as an array
  picks: [{
    week: Number,
    team: String,
    result: { type: String, default: "pending" }
  }],
  
  totalScore: { type: Number, default: 0 },
  
  // Add pickedTeams as an array of strings
  pickedTeams: [{ type: String, default: [] }]
});

const User = mongoose.model('User', UserSchema, 'users');

// Add this to your server.js
app.get('/api/leaderboard/:week', async (req, res) => {
  try {
    const week = parseInt(req.params.week);
    if (isNaN(week)) {
      return res.status(400).json({ success: false, message: 'Invalid week number' });
    }

    const users = await User.aggregate([
      {
        $project: {
          username: 1,
          totalScore: 1,
          picks: {
            $filter: {
              input: { $ifNull: ['$picks', []] }, // Ensure picks is treated as an array
              as: 'pick',
              cond: { $and: [
                { $eq: ['$$pick.week', week] },
                { $eq: ['$$pick.result', 'win'] }
              ]}
            }
          }
        }
      },
      {
        $addFields: {
          winsThisWeek: { $size: { $ifNull: ['$picks', []] } } // Use $ifNull here as well
        }
      },
      {
        $sort: { winsThisWeek: -1, totalScore: -1 }
      }
    ]);

    res.json({ success: true, leaderboard: users });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});



app.get('/api/teams-for-admin-week/:week', authenticateToken, async (req, res) => {
  console.log('Fetching teams for admin for week:', req.params.week);
  try {
    const week = parseInt(req.params.week);
    if (isNaN(week)) {
      return res.status(400).json({ success: false, message: 'Invalid week number' });
    }

    // Since we are not filtering teams by week in this example, we're just fetching all teams
    const teamsCollection = mongoose.connection.db.collection('teams');
    const allTeams = await teamsCollection.find().toArray();

    res.json(allTeams);
  } catch (error) {
    console.error('Error fetching teams for admin:', error);
    res.status(500).send('Error fetching teams');
  }
});



// API Route to fetch all users data
app.get('/api/all-users-data', async (req, res) => {
  try {
    const users = await User.find({}, '-password'); // Exclude the password field
    res.json({ success: true, users: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching users data', error: error.message });
  }
});

// Route to fetch user-specific data
app.get('/api/user-data', authenticateToken, async (req, res) => {
  try {
    // Assuming req.user.id is available from JWT
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Send specific user data to the frontend
    res.json({
      username: user.username,
      pickedTeams: user.pickedTeams
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// User Registration
app.post('/api/register', async (req, res) => {
  const { username, password, role } = req.body; // Include role
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role: role }); // Add role
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});


// User Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ 
      success: true, 
      token, 
      username: user.username, 
      role: user.role // Send user role
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});




// Route to fetch user data using User.findById
app.get('/api/get-user', authenticateToken, async (req, res) => {
  try {
      const user = await User.findById(req.user.id);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Ensure picks are sorted by week
      const userPicks = user.picks.sort((a, b) => a.week - b.week);

      res.json({ username: user.username, picks: userPicks, totalScore: user.totalScore });
  } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/delete-user/:userId', authenticateToken, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.userId);
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// Route to handle team selection
app.get('/api/get-user', authenticateToken, async (req, res) => {
  try {
      const user = await User.findById(req.user.id);
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Convert picks object into an array
      const userPicks = Object.keys(user.picks).map(week => ({
          week: parseInt(week),
          team: user.picks[week].team,
          result: user.picks[week].result
      }));

      res.json({ username: user.username, picks: userPicks, totalScore: user.totalScore });
  } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ message: 'Error on the server.' });
  }
});


// Fetch all teams with their statuses
app.get('/api/teams', authenticateToken, async (req, res) => {
  try {
    const teamsCollection = mongoose.connection.db.collection('teams');
    const gamesCollection = mongoose.connection.db.collection('games');

    const user = await User.findById(req.user.id);
    const pickedTeams = user ? user.pickedTeams || [] : [];

    const allTeams = await teamsCollection.find().toArray();
    const currentGames = await gamesCollection.find().toArray();

    const mergedTeams = allTeams.map((team) => {
      if (pickedTeams.includes(team.name)) {
        return { ...team, status: 'Picked' }; // Set status to "Picked"
      }

      const game = currentGames.find(
        (g) => g.homeTeam === team.name || g.awayTeam === team.name
      );

      if (game) {
        const now = moment().tz('America/New_York'); // Current time in EST
        const startTime = moment.tz(game.startTime, 'America/New_York'); // Game start time in EST
        const endTime = moment.tz(game.endTime, 'America/New_York'); // Game end time in EST

        const gameStatus = now.isBetween(startTime, endTime)
          ? 'Playing'
          : now.isAfter(endTime)
          ? 'Completed'
          : 'Scheduled';

        return {
          ...team,
          status: gameStatus,
          opponent: game.homeTeam === team.name ? game.awayTeam : game.homeTeam,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        };
      }
      return { ...team, status: 'Available' };
    });

    res.json(mergedTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).send('Error fetching teams');
  }
});

// Serve Admin Page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});


// Serve the main page for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the teams page for the /teams route
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

// Catch-all route to handle unmatched routes
app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

app.post('/api/pick-team', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      console.error("❌ User not found:", req.user.id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log("✅ User found:", user.username);
    console.log("📌 Received team pick:", req.body.team);

    // Get the current week number
    const currentWeek = moment().isoWeek();

    // Check if the user has already picked a team for this week
    const existingPickIndex = user.picks.findIndex(p => p.week === currentWeek);
    
    if (existingPickIndex !== -1) {
      console.error("❌ User already picked a team this week:", user.picks[existingPickIndex]);
      return res.status(400).json({ success: false, message: 'You have already picked a team this week' });
    }

    // Store the pick as a new array entry
    user.picks.push({ week: currentWeek, team: req.body.team, result: "pending" });
    user.lastPickDate = new Date();

    // Add the team to pickedTeams if it's not already there
    if (!user.pickedTeams.includes(req.body.team)) {
      user.pickedTeams.push(req.body.team);
    }

    await user.save();

    console.log("✅ Team pick saved successfully:", user.picks);
    console.log("✅ Team added to pickedTeams:", user.pickedTeams);

    res.json({ success: true, message: 'Team selected successfully', picks: user.picks, pickedTeams: user.pickedTeams });
  } catch (error) {
    console.error("❌ Error selecting team:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add this route to fetch teams for admin panel
app.get('/api/teams-for-admin', authenticateToken, async (req, res) => {
  try {
    const teamsCollection = mongoose.connection.db.collection('teams');
    const allTeams = await teamsCollection.find().toArray();
    res.json(allTeams);
  } catch (error) {
    console.error('Error fetching teams for admin:', error);
    res.status(500).send('Error fetching teams');
  }
});

// Add this route to update team results
app.post('/api/update-results', authenticateToken, async (req, res) => {
  const { results } = req.body;
  try {
    for (const result of results) {
      const { team, result: gameResult } = result;
      const userPicks = await User.updateMany(
        { 'picks.team': team, 'picks.result': 'pending' },
        { $set: { 'picks.$.result': gameResult === 'win' ? 'win' : 'loss' } }
      );

      // Update totalScore for users who picked the winning team
      if (gameResult === 'win') {
        await User.updateMany(
          { 'picks.team': team, 'picks.result': 'win' },
          { $inc: { totalScore: 1 } }
        );
      }
    }
    res.json({ success: true, message: 'Results updated successfully' });
  } catch (error) {
    console.error('Error updating results:', error);
    res.status(500).send('Error updating results');
  }
});

const admin = require("firebase-admin");
const cron = require("node-cron");

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase-service-account.json"); // Download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

// Function to send push notifications
async function sendPushNotifications() {
  const tokens = await getUserTokensFromDatabase(); // Fetch stored FCM tokens from MongoDB

  if (tokens.length === 0) return console.log("No users to notify.");

  const message = {
    notification: {
      title: "Pick Your NFL Team!",
      body: "It's Tuesday! Don't forget to select your NFL team for this week's game.",
    },
    tokens: tokens, // Send to multiple users
  };

  messaging
    .sendMulticast(message)
    .then((response) => console.log("Notifications sent:", response.successCount))
    .catch((error) => console.error("Error sending notifications:", error));
}

// Schedule notification every Tuesday at 1 PM EST
cron.schedule("0 13 * * 2", () => {
  console.log("Sending weekly notifications...");
  sendPushNotifications();
});


// Server

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

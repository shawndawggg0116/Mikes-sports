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
const admin = require("firebase-admin");
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

const serviceAccount = {
  type: "service_account",
  project_id: "mikes-sport-picks",
  private_key_id: "f2eac62af4a83a5037453aba441aa6168e392dd2",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDXR7XmJLQoratP
OtE6/8G2J7PFAjwZwK49kQKHiKMSqKq9MvkSXEOyH8TnJNrz2A49IpTevjHCaWs4
QeH/R3k95OfdaN0Q+XTgNYmksYpcCE3jfOPyaIufMRFzqnHMNnvzswx+imAfVYcp
qyVmeD1Crbl/dIwxrfWh6VRluOtaskhOqhgueaKGPU9KCIRoMHM+ZXfUG8v3r+Hf
e+EwKfwOPYh7cV+pLZJrodrzdEF8W2kXfrazMfHXen7on2s8MWOynYAMSYzn+uFd
3/ZqcBMr1N2NN1IYFaPZ4yI97dUYhFpOHerZc6BaRZoMrF+KeLPPns8sih2zZX6l
8/6K+b2/AgMBAAECggEAEY/Wijze4fcLVuFkwl9GpX4tcqCUV/Xf4PYS7EApX9mY
ybcLGl3V4ewoi0JDU4m1EHSuC1Idsg8Y5/p4t4zUZ0gX4cTu5jZLbzzyCrIddOHy
ixPPO24e5PCP5jOQQmLRdf4NwpO12rVTjoK/mgSsdRbB+ROzZujnjseyxfRk/4pB
Lgg0Sn0nodj5NXDQFhj54T8mu+7vqGFAIWqnAPCZ+6w/4WPkLLoO/tTaAgMrt9Ha
m1aTLUyor58vMcl2DODpFOBq//GQHRu1HGV/yLe6oyQgspE9L3YlzfcDUTIdwW9I
T+c/xa/MOr0Gkto7HS+sTgu7KZ/Jtl4BWszPbYFK1QKBgQDzhEeWbG86NrphqWJf
RmaBfSK7wrfU9GrxJn5gOrPa5Rti+wemYx4rSeNZkhsVutuyE9ST9e2YrsOkc6C7
je6Cu4t5dE2CBzO9LSOz1j47JLjsuBaVRWofxgg0jSgY/ZxH1QiACOmqzS4w9BKx
iQbaV0bXeqBxwiEAerOoWWP87QKBgQDiUOBM/F2OaVR6fGoaP1+E9lt3qYSfNnEs
t7BKXfx8J7M59dqGVss8FvkPcqKkXFYqQFa4xjDWHyrulD20PMFNi+qjSi4nmtLh
ql+ij4tpia8/eg0y1P2iE3YyVz4shNoXuzU8r8dEv7TgB8dRtFVoNcxPVWnkfr+S
XutcdMT72wKBgEc2Lq0ZhqlSacy3ePH9p2pEisy3k4St+TwOErTXVdM0Xn7ihAkv
QRpNoDOIW21OWILJ88dVCqc0rDfCLIXMaqxGZfIdhbD5pDK1KZSkmUw4X++xocED
LJagFbQwd0Jfn70N2k9+y75MBC8CoRjTxnJBRZEr5hF+QKJgP3uCsI+9AoGBANt2
9FyTqiINEIgLGFVFuVpWENMUx3AhulRT+RfU1qCLWylMudHmXwVxfaq2TvQ2OrSU
WcSrJPavmNFtXfznociSc0JQEDwFzpRZxI3+x4Hbq99Re3UcyKygVNFyeu9vEZNL
zs9/4ixP/5X01RvtVZlN+kfAm4SiSSIm+/RXpCJbAoGBANalLJ5AjRcDT3Xvvm9F
bBIvfye3a+fO+SrwvugAaj+qRSvC0t4BnBiZzPH9PamjGIDtcpevS/1hgS5DLVQL
3nwZFCnCALvcEYFjUWH5efZAxOP3o0NbHd0lQdtctgIWfe5coUEjH7Y6qoBgTnN+
aniS+rJhw1ysJAF1l5DGNb5q
-----END PRIVATE KEY-----\n`,
  client_email: "firebase-adminsdk-fbsvc@mikes-sport-picks.iam.gserviceaccount.com",
  client_id: "118407553526514843715",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40mikes-sport-picks.iam.gserviceaccount.com",
};


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


console.log("🔥 Firebase Private Key Loaded:", serviceAccount.private_key ? "Yes" : "No");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// API Route to Send Notifications
app.post("/api/send-notification", async (req, res) => {
  try {
    const { token, title, body } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "FCM Token is required." });
    }

    const message = {
      notification: {
        title: title || "🏈 NFL Picks Notification!",
        body: body || "Reminder: Pick your team for this week!",
      },
      token: token,
    };

    const response = await admin.messaging().send(message);
    console.log("✅ Notification Sent:", response);
    res.status(200).json({ success: true, message: "Notification sent successfully!" });

  } catch (error) {
    console.error("❌ Error sending notification:", error);
    res.status(500).json({ success: false, message: "Failed to send notification", error: error.message });
  }
});  

// Server

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

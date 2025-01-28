const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();

// JWT Secret
const JWT_SECRET = 'your_secret_key'; // Replace with a secure key

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const mongoUri = 'mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority&appName=mikes-sports0new';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// MongoDB Schemas and Models
const UserSchema = new mongoose.Schema({
  username: String,
  password: String, // Store hashed passwords in production
  pickedTeams: [String],
  lastPickDate: Date,
});

const User = mongoose.model('User', UserSchema, 'users');

// Utility function to convert UTC to EST
function convertUTCToEST(date) {
  const utcDate = new Date(date);
  const estOffset = -5 * 60; // Eastern Time is UTC-5
  return new Date(utcDate.getTime() + estOffset * 60000);
}

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).send({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Routes
// Login Route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password) { // Add password hashing later
      return res.status(401).send({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.send({ success: true, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send({ success: false, message: 'Server error' });
  }
});

// Fetch user-picked teams
app.get('/api/user-teams', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ pickedTeams: user.pickedTeams });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data');
  }
});

// Serve index.html for the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve teams.html for the /teams route
app.get('/teams', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'teams.html'));
});

// Fetch all teams with their statuses
app.get('/api/teams', authenticateToken, async (req, res) => {
  try {
    const teamsCollection = mongoose.connection.db.collection('teams');
    const gamesCollection = mongoose.connection.db.collection('games');

    const allTeams = await teamsCollection.find().toArray();
    const currentGames = await gamesCollection.find().toArray();

    console.log("All Teams: ", allTeams);
    console.log("Current Games: ", currentGames);

    const mergedTeams = allTeams.map((team) => {
      const game = currentGames.find(
        (g) => g.homeTeam === team.name || g.awayTeam === team.name
      );

      if (game) {
        const now = new Date();
        const startTime = convertUTCToEST(game.startTime);
        const endTime = convertUTCToEST(game.endTime);

        const gameStatus =
          now >= startTime && now <= endTime
            ? "Playing"
            : now > endTime
            ? "Completed"
            : "Scheduled";

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

// Save picked team endpoint
app.post('/api/pick-team', authenticateToken, async (req, res) => {
  const { team } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).send({ success: false, message: 'User not found' });
    }
    if (user.pickedTeams.includes(team)) {
      return res
        .status(400)
        .send({ success: false, message: 'Team already picked' });
    }
    user.pickedTeams.push(team);
    user.lastPickDate = new Date();
    await user.save();
    res.send({ success: true });
  } catch (error) {
    console.error('Error saving picked team:', error);
    res.status(500).send({ success: false, message: 'Error saving picked team' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

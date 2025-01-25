const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
  .then(() => console.log('Connected to MongoDB'))
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
  pickedTeams: [{ team: String, week: Number }], // Store picks with week number
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Game schema (assuming you have a separate collection for games)
const gameSchema = new mongoose.Schema({
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  startTime: { type: Date, required: true },
  status: { type: String, enum: ['upcoming', 'in_progress', 'finished'], default: 'upcoming' }
});

const Game = mongoose.model('Game', gameSchema);

// Routes

// ... (Your existing user routes: Register, Login, etc.)

// Fetch user's picked teams with week information
app.get('/get-picked-teams', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).send({ success: false, message: 'Username is required.' });
  }

  try {
    const user = await User.findOne({ username }).populate('pickedTeams');
    if (!user) {
      return res.status(404).send({ success: false, message: 'User not found.' });
    }

    res.send({ success: true, pickedTeams: user.pickedTeams });
  } catch (error) {
    console.error('Error fetching picked teams:', error);
    res.status(500).send({ success: false, message: 'Error fetching picked teams.' });
  }
});

// Fetch available teams for the current week
app.get('/get-available-teams', async (req, res) => {
  try {
    const currentWeek = getWeek(new Date()); // Get the current week
    const today = new Date();

    const availableGames = await Game.find({ 
      startTime: { $gte: today }, 
      status: 'upcoming' 
    });

    const availableTeams = availableGames.map(game => [game.homeTeam, game.awayTeam]).flat(); 

    res.send({ success: true, teams: availableTeams });
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status(500).send({ success: false, message: 'Error fetching available teams.' });
  }
});

// Handle team selection (with week check)
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

    const currentWeek = getWeek(new Date()); 
    const hasPickedThisWeek = user.pickedTeams.some(pick => pick.week === currentWeek);

    if (hasPickedThisWeek) {
      return res.status(400).send({ success: false, message: 'You have already made a pick for this week.' });
    }

    if (user.pickedTeams.some(pick => pick.team === team)) {
      return res.status(400).send({ success: false, message: 'You already picked this team.' });
    }

    user.pickedTeams.push({ team: team, week: currentWeek }); 
    await user.save();

    res.send({ success: true, message: `You picked ${team}` });
  } catch (error) {
    console.error('Error selecting team:', error);
    res.status(500).send({ success: false, message: 'Error selecting team.' });
  }
});

// Helper function to get the current week of the year
function getWeek(date) {
  date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  var weekNo = Math.ceil(( ( (date - yearStart) / 86400000) + 1)/7)
  return weekNo;
}

// ... (Rest of your routes)

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
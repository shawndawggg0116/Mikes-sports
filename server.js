require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Database connection error:', err));

// Schemas and Models
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
  favoriteTeams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  gamePicks: [{
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    pickedTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  }],
}));

const Team = mongoose.model('Team', new mongoose.Schema({
  name: String,
  status: String, // e.g., Available, Playing, Completed
}));

const Game = mongoose.model('Game', new mongoose.Schema({
  homeTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  awayTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  startTime: Date,
  endTime: Date,
}));

// Middleware for Authentication
const authenticate = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send('Access Denied');

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).send('Invalid Token');
  }
};

// Routes

// Fetch all teams
app.get('/api/teams', authenticate, async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching teams' });
  }
});

// Pick a team for the user
app.post('/api/pick-team', authenticate, async (req, res) => {
  try {
    const { team } = req.body;
    const teamData = await Team.findOne({ name: team });
    if (!teamData) return res.status(404).json({ message: 'Team not found' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if team is already picked
    if (user.favoriteTeams.includes(teamData._id)) {
      return res.status(400).json({ message: 'You already picked this team' });
    }

    user.favoriteTeams.push(teamData._id);
    await user.save();

    res.json({ success: true, message: 'Team picked successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Error picking team' });
  }
});

// Fetch user picks
app.get('/api/user-picks', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('gamePicks.gameId')
      .populate('gamePicks.pickedTeamId');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user.gamePicks);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user picks' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

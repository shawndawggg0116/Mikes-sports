
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  picks: [{ week: Number, team: String }],
});

const teamSchema = new mongoose.Schema({
  name: String,
  status: String,
});

const User = mongoose.model('User', userSchema);
const Team = mongoose.model('Team', teamSchema);

// Middleware to verify token
function verifyToken(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).send('Access Denied');

  jwt.verify(token, 'JWT_SECRET_KEY', (err, user) => {
    if (err) return res.status(403).send('Invalid Token');
    req.user = user;
    next();
  });
}

// Route for user login (placeholder example, replace as needed)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ username: user.username }, 'JWT_SECRET_KEY', { expiresIn: '1h' });
  res.json({ token });
});

// API to fetch teams
app.get('/api/teams', verifyToken, async (req, res) => {
  try {
    const teams = await Team.find();
    const user = await User.findOne({ username: req.user.username });
    if (user) {
      teams.forEach((team) => {
        if (user.picks.some((pick) => pick.team === team.name)) {
          team.status = 'Picked';
        }
      });
    }
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching teams' });
  }
});

// API to pick a team
app.post('/api/pick-team', verifyToken, async (req, res) => {
  const { team } = req.body;
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Ensure the team is not already picked
    if (user.picks.some((pick) => pick.team === team)) {
      return res.status(400).json({ error: 'Team already picked' });
    }

    user.picks.push({ week: 1, team }); // Add week dynamically if needed
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error saving pick' });
  }
});

// API to reset picks (admin functionality)
app.post('/api/reset-picks', verifyToken, async (req, res) => {
  if (req.user.username !== 'admin') return res.status(403).json({ error: 'Access denied' });

  try {
    await User.updateMany({}, { $set: { picks: [] } });
    res.json({ success: true, message: 'Picks reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error resetting picks' });
  }
});

// API to update team status (admin functionality)
app.post('/api/update-team-status', verifyToken, async (req, res) => {
  if (req.user.username !== 'admin') return res.status(403).json({ error: 'Access denied' });

  const { teamName, status } = req.body;
  try {
    const team = await Team.findOne({ name: teamName });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    team.status = status;
    await team.save();
    res.json({ success: true, message: 'Team status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error updating team status' });
  }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

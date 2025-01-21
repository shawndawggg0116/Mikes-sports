
const express = require('express');
const app = express();
const schedules = require('./schedules');
const mongoose = require('mongoose');
const session = require('express-session');
const cron = require('node-cron');
const PORT = process.env.PORT || 3000;

app.use(express.json());

// MongoDB connection
mongoose.connect(
  'mongodb://localhost:27017/nfl-picks-app',
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  pickedTeams: { type: [String], default: [] },
  selectedTeam: { type: String, default: null },
  lastPickDate: { type: Date, default: null },
  points: { type: Number, default: 0 }
});
const User = mongoose.model('User', userSchema);

// API to fetch game statuses
app.get('/api/game-status', async (req, res) => {
  const username = req.query.username;
  const user = await User.findOne({ username });

  const now = new Date();
  const updatedSchedules = schedules.map((game) => {
    let status = 'upcoming';
    if (game.startTime && game.endTime) {
      if (now >= new Date(game.startTime) && now <= new Date(game.endTime)) {
        status = 'glowing';
      } else if (now > new Date(game.endTime)) {
        status = 'greyed-out';
      }
    }
    const disabled =
      user?.pickedTeams.includes(game.teamA) || user?.pickedTeams.includes(game.teamB);
    return { ...game, status, disabled };
  });

  res.json(updatedSchedules);
});

// API to save team picks
app.post('/api/select-team', async (req, res) => {
  const { username, team } = req.body;
  const user = await User.findOne({ username });

  if (!user) return res.status(404).send('User not found.');
  if (user.pickedTeams.includes(team)) return res.status(400).send('Team already picked.');

  user.selectedTeam = team;
  user.pickedTeams.push(team);
  user.lastPickDate = new Date();
  await user.save();

  res.send('Team selection saved.');
});

// Weekly reset CRON job
cron.schedule('0 0 * * 2', async () => {
  await User.updateMany({}, { selectedTeam: null });
  console.log('Weekly reset completed.');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const mongoUri =
  'mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority&appName=mikes-sports0new';
mongoose
  .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// MongoDB Schemas and Models
const UserSchema = new mongoose.Schema({
  username: String,
  pickedTeams: [String],
  lastPickDate: Date,
});

const User = mongoose.model('User', UserSchema, 'users');

// Routes
// Fetch all teams with their statuses
app.get('/api/teams', async (req, res) => {
  try {
    // Fetch all teams from the 'teams' collection
    const allTeams = await mongoose.connection
      .collection('teams')
      .find()
      .toArray();

    // Fetch all games from the 'games' collection
    const currentGames = await mongoose.connection
      .collection('games')
      .find()
      .toArray();

    // Merge teams with their status
    const allTeamsWithStatus = allTeams.map((team) => {
      const game = currentGames.find(
        (g) => g.homeTeam === team.name || g.awayTeam === team.name
      );

      if (game) {
        const now = new Date();
        const startTime = new Date(game.startTime);
        const endTime = new Date(game.endTime);

        if (now >= startTime && now <= endTime) {
          return {
            ...team,
            status: 'Playing',
            opponent:
              game.homeTeam === team.name ? game.awayTeam : game.homeTeam,
          };
        } else if (now > endTime) {
          return { ...team, status: 'Completed' };
        } else {
          return {
            ...team,
            status: 'Scheduled',
            opponent:
              game.homeTeam === team.name ? game.awayTeam : game.homeTeam,
          };
        }
      }

      return { ...team, status: 'Available' }; // Team not in any game
    });

    res.json(allTeamsWithStatus);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).send('Error fetching teams');
  }
});

// Mock `/api/user-teams` endpoint
app.get('/api/user-teams', async (req, res) => {
  try {
    const user = await User.findOne({ username: 'shawn1' }); // Replace with dynamic username
    if (!user) {
      return res.status(404).send({ pickedTeams: [] });
    }
    res.json({ pickedTeams: user.pickedTeams });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data');
  }
});

// Save picked team endpoint
app.post('/api/pick-team', async (req, res) => {
  const { team } = req.body;
  try {
    const user = await User.findOne({ username: 'shawn1' }); // Replace with dynamic username
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

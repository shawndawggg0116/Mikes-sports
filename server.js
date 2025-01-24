
const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

const scheduleSchema = new mongoose.Schema({
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, default: 'upcoming' }
});

const schedules = mongoose.model('Schedule', scheduleSchema);

mongoose.connect('mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/?retryWrites=true&w=majority&appName=mikes-sports0new', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

app.get('/api/game-status', async (req, res) => {
  try {
    const games = await schedules.find({});
    const now = new Date();

    const updatedGames = games.map(game => {
      const startTime = new Date(game.startTime);
      const endTime = new Date(game.endTime);

      if (now >= startTime && now <= endTime) {
        game.status = 'flashing';
      } else if (now > endTime) {
        game.status = 'disabled';
      } else {
        game.status = 'upcoming';
      }

      return game;
    });

    res.json(updatedGames);
  } catch (error) {
    console.error('Error fetching game status:', error);
    res.status(500).send({ success: false, message: 'Error fetching game status.' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

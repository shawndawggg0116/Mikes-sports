const axios = require('axios');
const mongoose = require('mongoose');

// MongoDB connection
mongoose.connect('mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nflGameDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Game schema
const GameSchema = new mongoose.Schema({
  gameId: String,
  week: Number,
  team1: String,
  team2: String,
  startTime: Date,
  endTime: Date,
  status: String, // scheduled, in-progress, finished
});

const Game = mongoose.model('Game', GameSchema);

// Fetch NFL schedule and store in MongoDB
async function fetchAndStoreSchedule() {
  try {
    const response = await axios.get('https://api.balldontlie.io/v1/nfl/schedules', {
      headers: { 'Authorization': '1384160c-0e89-4e67-a763-23f51b996df9' },
    });

    const schedule = response.data.map(game => ({
      gameId: game.id,
      week: game.week, // Use the correct mapping for your API
      team1: game.home_team.abbreviation,
      team2: game.visitor_team.abbreviation,
      startTime: new Date(game.date),
      endTime: new Date(new Date(game.date).getTime() + 3 * 60 * 60 * 1000),
      status: 'scheduled',
    }));

    await Game.insertMany(schedule);
    console.log('NFL schedule successfully stored.');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error fetching schedule:', error);
  }
}

fetchAndStoreSchedule();


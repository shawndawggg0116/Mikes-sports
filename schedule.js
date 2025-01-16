const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  date: { type: String, required: true }, // Date in "YYYY-MM-DD"
  time: { type: String, required: true }, // Time in "HH:mm:ss"
  location: { type: String, required: true },
  status: { type: String, default: 'Scheduled' },
  homeTeamScore: { type: Number, default: null },
  awayTeamScore: { type: Number, default: null },
});

const scheduleSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  games: [gameSchema], // Array of games
});

module.exports = mongoose.model('Schedule', scheduleSchema);

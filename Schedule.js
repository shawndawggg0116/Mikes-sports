const mongoose = require('mongoose');

// Define the Schedule schema
const scheduleSchema = new mongoose.Schema({
  week: Number,
  games: [
    {
      homeTeam: String,
      awayTeam: String,
      date: String,
      time: String,
      location: String,
      status: String,
      homeTeamScore: Number,
      awayTeamScore: Number,
    },
  ],
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;

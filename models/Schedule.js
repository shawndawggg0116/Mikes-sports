const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  games: [
    {
      homeTeam: { type: String, required: true },
      awayTeam: { type: String, required: true },
      date: { type: String, required: true },
      time: { type: String, required: true },
      location: { type: String, required: true },
      homeTeamScore: { type: Number, default: null },
      awayTeamScore: { type: Number, default: null },
      status: { type: String, default: "Scheduled" },
    },
  ],
});

module.exports = mongoose.model('Schedule', scheduleSchema);

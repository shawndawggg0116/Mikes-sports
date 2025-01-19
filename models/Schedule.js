const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  home: { type: String, required: true },
  away: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: { type: String, default: 'Scheduled' } // Possible values: Scheduled, Live, Completed
});

const scheduleSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  games: [gameSchema]
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;

const mongoose = require('mongoose');
const cron = require('node-cron');

// MongoDB connection
const mongoURI = 'mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority&appName=mikes-sports0new';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

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

const Schedule = mongoose.model('Schedule', scheduleSchema, 'schedules');

// Update Game Status
const updateGameStatus = async () => {
  try {
    const now = new Date();
    const schedules = await Schedule.find({});

    for (const schedule of schedules) {
      for (const game of schedule.games) {
        const gameDate = new Date(`${game.date}T${game.time}Z`);
        if (now < gameDate) {
          game.status = 'Scheduled';
        } else if (now >= gameDate && now <= new Date(gameDate.getTime() + 3 * 60 * 60 * 1000)) {
          game.status = 'Live';
        } else {
          game.status = 'Completed';
        }
      }
      await Schedule.updateOne({ _id: schedule._id }, { games: schedule.games });
    }

    console.log('Game statuses updated!');
  } catch (error) {
    console.error('Error updating game statuses:', error);
  }
};

// Run every 15 minutes
cron.schedule('*/15 * * * *', () => {
  console.log('Updating game statuses...');
  updateGameStatus();
});

module.exports = updateGameStatus;

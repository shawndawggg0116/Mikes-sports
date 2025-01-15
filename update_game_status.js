const mongoose = require('mongoose');
const Schedule = require('./models/Schedule'); // Adjust the path as needed
const moment = require('moment-timezone'); // Install this: npm install moment-timezone

mongoose.connect(
  'mongodb+srv://your-mongo-connection-string',
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const updateGameStatus = async () => {
  try {
    const now = moment().tz('America/New_York'); // Current EST time

    // Fetch all schedules
    const schedules = await Schedule.find();
    for (const schedule of schedules) {
      for (const game of schedule.games) {
        const gameTime = moment.tz(`${game.date} ${game.time}`, 'YYYY-MM-DD HH:mm:ss', 'America/New_York');
        if (now.isAfter(gameTime) && now.diff(gameTime, 'hours') < 3) {
          game.status = 'Live'; // Within 3 hours of the start time
        } else if (now.isAfter(gameTime)) {
          game.status = 'Completed'; // Game time has passed
        } else {
          game.status = 'Scheduled'; // Future game
        }
      }
      // Save the updated schedule
      await schedule.save();
    }
    console.log('Game statuses updated successfully!');
  } catch (error) {
    console.error('Error updating game statuses:', error);
  } finally {
    mongoose.connection.close();
  }
};

updateGameStatus();

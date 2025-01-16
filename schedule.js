const mongoose = require('mongoose');
const Schedule = require('./models/schedule'); // Adjust the path as needed

async function updateGameStatus() {
  try {
    const now = new Date();
    const schedules = await Schedule.find();

    schedules.forEach(async (game) => {
      const gameTime = new Date(game.date); // Ensure your `date` field is in UTC
      const endTime = new Date(gameTime.getTime() + 3 * 60 * 60 * 1000); // Add 3 hours

      if (now < gameTime) {
        game.status = 'upcoming'; // Game has not started yet
      } else if (now >= gameTime && now <= endTime) {
        game.status = 'live'; // Game is live
      } else {
        game.status = 'completed'; // Game has ended
      }

      await game.save();
    });
  } catch (error) {
    console.error('Error updating game status:', error);
  }
}

module.exports = updateGameStatus;

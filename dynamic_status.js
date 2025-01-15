const mongoose = require('mongoose');
const cron = require('node-cron');
const Schedule = require('./models/Schedule'); // Adjust path

// MongoDB connection string (replace with your actual connection string)
const MONGO_URI = 'your_mongodb_connection_string_here';

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Error connecting to MongoDB:", err));

// Update game statuses dynamically
const updateGameStatuses = async () => {
  const now = new Date();

  try {
    const schedules = await Schedule.find();

    schedules.forEach(async (week) => {
      week.games.forEach((game) => {
        const gameTime = new Date(`${game.date}T${game.time}`);

        if (now >= gameTime && game.status === "Scheduled") {
          game.status = "Playing";
        } else if (now > gameTime.getTime() + 3 * 60 * 60 * 1000) { // Game duration is 3 hours
          game.status = "Completed";
        }
      });

      // Save updates to the week
      await week.save();
    });

    console.log("Game statuses updated dynamically!");
  } catch (err) {
    console.error("Error updating game statuses:", err);
  }
};

// Schedule the dynamic updates to run every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log("Running game status update...");
  await updateGameStatuses();
});

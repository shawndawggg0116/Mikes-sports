const mongoose = require('mongoose');
const cron = require('node-cron');

// MongoDB connection string (replace with your actual connection string)
const MONGO_URI = 'your_mongodb_connection_string_here';

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Error connecting to MongoDB:", err));

// Schedule and User schemas (update as needed)
const Schedule = require('./models/Schedule'); // Adjust path
const User = require('./models/User'); // Adjust path

// Weekly reset logic
const resetWeeklyData = async () => {
  try {
    // Reset all user weekly picks
    await User.updateMany({}, { $set: { weeklyPicks: [] } });

    // Reset game statuses for the new week
    const currentWeek = await getCurrentWeek();
    await Schedule.updateMany({}, { $set: { "games.$[].status": "Scheduled" } });

    console.log(`Weekly data reset for week ${currentWeek}`);
  } catch (err) {
    console.error("Error during weekly reset:", err);
  }
};

// Helper function to determine the current week
const getCurrentWeek = async () => {
  // You can base this logic on the current date or your application's week tracking system
  const now = new Date();
  const weekNumber = Math.floor((now - new Date("2025-01-01")) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return weekNumber;
};

// Schedule the reset to run every Tuesday at midnight
cron.schedule('0 0 * * 2', async () => {
  console.log("Running weekly reset...");
  await resetWeeklyData();
  console.log("Weekly reset completed!");
});

const mongoose = require('mongoose');
const fs = require('fs');

// MongoDB connection string (replace with your connection string)
const MONGO_URI = 'your_mongodb_connection_string_here';

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Error connecting to MongoDB:", err));

// Define the schema
const scheduleSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  games: [
    {
      homeTeam: { type: String, required: true },
      awayTeam: { type: String, required: true },
      date: { type: String, required: true },
      time: { type: String, required: true },
      location: { type: String, required: true },
      status: { type: String, default: "Scheduled" },
      homeTeamScore: { type: Number, default: null },
      awayTeamScore: { type: Number, default: null }
    }
  ]
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

// Load the JSON data
const scheduleData = JSON.parse(fs.readFileSync('./Mock_NFL_Schedule_for_Testing.json', 'utf8'));

// Insert the data
Schedule.insertMany(scheduleData)
  .then(() => {
    console.log("NFL schedule inserted successfully!");
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("Error inserting schedule:", err);
    mongoose.connection.close();
  });

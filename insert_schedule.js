const mongoose = require('mongoose');
const fs = require('fs');

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

const Schedule = mongoose.model('Schedule', scheduleSchema, 'schedules'); // Explicitly target 'schedules' collection

// Read the JSON file
const data = JSON.parse(fs.readFileSync('./data/Mock_NFL_Schedule_for_Testing.json', 'utf8'));

// Insert data into MongoDB
const insertData = async () => {
  try {
    await Schedule.deleteMany({}); // Clear existing schedules
    await Schedule.insertMany(data);
    console.log('Data successfully inserted into the schedules collection!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error inserting data:', error);
    mongoose.connection.close();
  }
};

insertData();

const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = 'mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority';

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

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    const data = JSON.parse(fs.readFileSync('./Mock_NFL_Schedule_for_Testing.json', 'utf8'));
    console.log('Inserting schedule data:', data);

    Schedule.insertMany(data)
      .then(() => {
        console.log('Schedule data inserted successfully!');
        mongoose.connection.close();
      })
      .catch((err) => {
        console.error('Error inserting schedule:', err);
        mongoose.connection.close();
      });
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

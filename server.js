const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files
app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  })
);

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  selectedTeam: { type: String, default: null },
  pickedTeams: { type: [String], default: [] },
  lastPickDate: { type: Date, default: null },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Function to fetch real-time NFL data
const fetchNFLData = async () => {
  const url = "https://api.sportsdata.io/v3/nfl/scores/json/Schedules/2024";
  const options = {
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.RAPIDAPI_KEY
    }
  };
  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    console.error("Error fetching NFL data:", error);
    return [];
  }
};

// Serve the team selection page with real-time data
app.get('/teams', async (req, res) => {
  try {
    const nflData = await fetchNFLData();
    const currentTime = new Date();

    const teamStatus = nflData.reduce((status, game) => {
      const homeTeam = game.HomeTeam;
      const awayTeam = game.AwayTeam;
      const gameTime = new Date(game.Date);

      if (gameTime > currentTime) {
        status[homeTeam] = "upcoming";
        status[awayTeam] = "upcoming";
      } else if (gameTime.toDateString() === currentTime.toDateString()) {
        status[homeTeam] = "live";
        status[awayTeam] = "live";
      } else {
        status[homeTeam] = "completed";
        status[awayTeam] = "completed";
      }
      return status;
    }, {});

    res.send({ teamStatus });
  } catch (error) {
    console.error("Error serving teams:", error);
    res.status(500).send("Error fetching team data.");
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

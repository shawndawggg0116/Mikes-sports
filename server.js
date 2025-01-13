const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios'); // Added for real-time NFL schedule scraping

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

// Real-time NFL schedule scraper
const fetchNFLData = async () => {
  const url = "https://api.sportsdata.io/v3/nfl/scores/json/Schedules/2024"; // Replace with an active API URL
  const options = {
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.RAPIDAPI_KEY // Add your API key in the environment variables
    }
  };
  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    console.error("Error fetching NFL schedule:", error);
    return [];
  }
};

// Serve the team selection page
app.get('/teams', async (req, res) => {
  try {
    const nflData = await fetchNFLData();
    const currentTime = new Date();

    // Map teams to their current game status
    const teamStatuses = nflData.reduce((status, game) => {
      const gameTime = new Date(game.Date);
      const homeTeam = game.HomeTeam;
      const awayTeam = game.AwayTeam;

      if (gameTime > currentTime) {
        status[homeTeam] = 'upcoming';
        status[awayTeam] = 'upcoming';
      } else if (gameTime <= currentTime && gameTime.getDate() === currentTime.getDate()) {
        status[homeTeam] = 'live';
        status[awayTeam] = 'live';
      } else {
        status[homeTeam] = 'completed';
        status[awayTeam] = 'completed';
      }
      return status;
    }, {});

    res.send({ teamStatuses });
  } catch (error) {
    console.error("Error serving team statuses:", error);
    res.status(500).send("Error fetching team statuses.");
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

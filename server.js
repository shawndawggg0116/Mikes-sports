const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

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
app.use(express.static(path.join(__dirname, 'public')));
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

// Routes
// ... (All route handlers remain unchanged)

let cachedTeams = [];

// Function to scrape NFL teams
async function scrapeAndCacheNFLTeams() {
  try {
    const url = 'https://www.pro-football-reference.com/teams/';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const teams = [];
    $('table#teams_active tbody tr').each((i, el) => {
      const teamName = $(el).find('th[data-stat="team_name"] a').text();
      const wins = $(el).find('td[data-stat="wins"]').text();
      const losses = $(el).find('td[data-stat="losses"]').text();

      if (teamName) {
        teams.push({
          teamName,
          wins: parseInt(wins, 10) || 0,
          losses: parseInt(losses, 10) || 0,
          status: 'available',
        });
      }
    });

    cachedTeams = teams;
    console.log('NFL team data updated!');
  } catch (error) {
    console.error('Error scraping NFL teams:', error.message);
  }
}

// Run the scraper when the server starts
scrapeAndCacheNFLTeams();

// Schedule the scraper to run every 6 hours
cron.schedule('0 */6 * * *', scrapeAndCacheNFLTeams);

app.get('/nfl-teams', (req, res) => {
  if (cachedTeams.length === 0) {
    return res.status(503).send('NFL team data is not available yet. Please try again later.');
  }
  res.json(cachedTeams);
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
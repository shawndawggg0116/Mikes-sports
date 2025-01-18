// Assuming this logic is in your server.js
const express = require("express");
const mongoose = require("mongoose");
const moment = require("moment-timezone"); // Use moment-timezone for consistent timezone handling
const app = express();

// MongoDB Game Schema
const GameSchema = new mongoose.Schema({
  homeTeam: String,
  awayTeam: String,
  startTime: Date,
  status: String,
});

const Game = mongoose.model("Game", GameSchema);

// Update game statuses dynamically based on the current time
async function updateGameStatuses() {
  try {
    const games = await Game.find();
    const currentTime = moment().tz("America/New_York"); // Use Eastern Time

    for (const game of games) {
      const gameStartTime = moment(game.startTime).tz("America/New_York");
      const gameEndTime = gameStartTime.clone().add(3, "hours"); // Assume game duration is 3 hours

      if (currentTime.isBefore(gameStartTime)) {
        game.status = "Upcoming";
      } else if (currentTime.isBetween(gameStartTime, gameEndTime)) {
        game.status = "Ongoing";
      } else if (currentTime.isAfter(gameEndTime)) {
        game.status = "Completed";
      }

      await game.save(); // Save the updated status to the database
    }

    console.log("Game statuses updated successfully.");
  } catch (error) {
    console.error("Error updating game statuses:", error);
  }
}

// Call updateGameStatuses every minute to keep statuses accurate
setInterval(updateGameStatuses, 60000); // Update every 60 seconds

// API Endpoint to fetch games
app.get("/api/games", async (req, res) => {
  try {
    const games = await Game.find();
    res.json({ games });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch games." });
  }
});

// MongoDB Connection and Server Setup
mongoose
  .connect("your-mongodb-connection-string", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(3000, () => console.log("Server running on port 3000"));
  })
  .catch((error) => console.error("Failed to connect to MongoDB:", error));

const express = require("express");
const Game = require("../models/Game");
const router = express.Router();

// Get all games
router.get("/", async (req, res) => {
  const games = await Game.find();
  res.json(games);
});

// Update game status
router.put("/update", async (req, res) => {
  const { gameId, status } = req.body;
  await Game.findByIdAndUpdate(gameId, { status });
  res.json({ message: "Game status updated" });
});

module.exports = router;

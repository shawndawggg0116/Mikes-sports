const express = require("express");
const Team = require("../models/Team");
const router = express.Router();

// Get All Teams
router.get("/", async (req, res) => {
  const teams = await Team.find();
  res.json(teams);
});

module.exports = router;


const express = require('express');
const router = express.Router();
const Team = require('./models/Team');

// Endpoint to get all teams
router.get('/api/teams', async (req, res) => {
    try {
        const teams = await Team.find();
        res.json(teams);
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;

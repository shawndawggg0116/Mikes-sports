
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (like index.html)
app.use(express.static(__dirname));

// Mock NFL schedule data (Replace with your database query)
const nflSchedule = [
    { homeTeam: "Cardinals", awayTeam: "Bears", status: "Completed", dateTime: "2025-01-18T20:00:00Z" },
    { homeTeam: "Jets", awayTeam: "Dolphins", status: "InProgress", dateTime: "2025-01-19T22:00:00Z" },
    { homeTeam: "Packers", awayTeam: "Giants", status: "Upcoming", dateTime: "2025-01-20T02:00:00Z" }
];

// Define the /api/schedules route
app.get('/api/schedules', (req, res) => {
    res.json({ games: nflSchedule });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

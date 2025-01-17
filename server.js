const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 10000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB')).catch(err => console.error('MongoDB connection error:', err));

// Schedule Schema
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
        }
    ]
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

// Debug Logging Utility
const debugLog = (message, data = null) => {
    console.log(`[DEBUG] ${message}`);
    if (data) console.log(data);
};

// Function to dynamically calculate the current week
const getCurrentWeek = () => {
    const seasonStartDate = new Date('2025-01-01T00:00:00Z'); // Adjust season start date as needed
    const now = new Date();
    const diffInMilliseconds = now - seasonStartDate;
    const diffInWeeks = Math.ceil(diffInMilliseconds / (7 * 24 * 60 * 60 * 1000));
    debugLog('Calculated current week:', diffInWeeks);
    return diffInWeeks;
};

// Endpoint to fetch games for the current week
app.get('/api/games', async (req, res) => {
    try {
        const currentWeek = getCurrentWeek();

        debugLog('Fetching games for week:', currentWeek);

        const schedule = await Schedule.findOne({ week: currentWeek });

        if (!schedule) {
            debugLog('No schedule found for the current week');
            return res.status(404).json({ message: 'No schedules found for the current week.' });
        }

        debugLog('Schedule retrieved:', schedule);

        res.json(schedule);
    } catch (err) {
        console.error('Error fetching games:', err);
        res.status(500).json({ message: 'Error fetching games.' });
    }
});

// Periodic Game Status Update Function
const updateGameStatuses = async () => {
    try {
        debugLog('Updating game statuses...');

        const now = new Date();
        const schedules = await Schedule.find();

        schedules.forEach(schedule => {
            schedule.games.forEach(game => {
                const gameDateTime = new Date(`${game.date}T${game.time}`);
                if (now > gameDateTime) {
                    game.status = 'Completed';
                } else if (now.toDateString() === gameDateTime.toDateString()) {
                    game.status = 'Ongoing';
                } else {
                    game.status = 'Scheduled';
                }
            });

            schedule.save();
            debugLog('Updated schedule:', schedule);
        });

        debugLog('Game statuses updated!');
    } catch (err) {
        console.error('Error updating game statuses:', err);
    }
};

// Schedule the game status update every 5 minutes
setInterval(updateGameStatuses, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

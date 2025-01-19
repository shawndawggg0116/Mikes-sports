const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoURI = process.env.MONGO_URI || "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/?retryWrites=true&w=majority&appName=mikes-sports0new";

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

// Define the schema for the schedule
const scheduleSchema = new mongoose.Schema({
    week: Number,
    games: [
        {
            homeTeam: String,
            awayTeam: String,
            status: String,
            dateTime: String,
        }
    ]
});

// Create a model for the schedule
const Schedule = mongoose.model('Schedule', scheduleSchema, 'schedules');

// API route to fetch schedules
app.get('/api/schedules', async (req, res) => {
    try {
        const schedules = await Schedule.find(); // Fetch all schedules
        res.json(schedules);
    } catch (err) {
        console.error('Error fetching schedules:', err);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

// Serve static files (like index.html)
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


const mongoose = require('mongoose');
const Team = require('./models/Team');
const fs = require('fs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'your-mongodb-connection-string', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));

// Load teams from JSON
const teams = JSON.parse(fs.readFileSync('./public/teams.json', 'utf8'));


// Upload teams to the database
const uploadTeams = async () => {
    try {
        await Team.deleteMany(); // Clear existing teams
        await Team.insertMany(teams); // Insert new teams
        console.log('Teams uploaded successfully!');
        process.exit();
    } catch (error) {
        console.error('Error uploading teams:', error);
        process.exit(1);
    }
};

uploadTeams();

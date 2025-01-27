const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const mongoUri = "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/?retryWrites=true&w=majority&appName=mikes-sports0new";
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const ScheduleSchema = new mongoose.Schema({
  homeTeam: String,
  awayTeam: String,
  startTime: Date,
  endTime: Date,
  status: String,
});
const Schedule = mongoose.model('Schedule', ScheduleSchema, 'nfl_games.games');

app.get('/api/teams', async (req, res) => {
    try {
        const teams = await Schedule.find();
        res.send(teams);
    } catch (err) {
        console.error('Error fetching teams:', err);
        res.status(500).send({ success: false, message: 'Server error' });
    }
});

app.post('/api/pick-team', async (req, res) => {
    const { team } = req.body;
    try {
        const pickedTeam = await Schedule.findOneAndUpdate(
            { homeTeam: team },
            { status: 'Picked' },
            { new: true }
        );
        if (pickedTeam) {
            res.send({ success: true });
        } else {
            res.status(400).send({ success: false, message: 'Team not found or already picked' });
        }
    } catch (err) {
        console.error('Error picking team:', err);
        res.status(500).send({ success: false, message: 'Server error' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

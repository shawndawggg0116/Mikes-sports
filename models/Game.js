
const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, required: true, enum: ['Upcoming', 'Ongoing', 'Completed'], default: 'Upcoming' }
});

const Game = mongoose.model('Game', gameSchema);
module.exports = Game;

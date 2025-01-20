
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: String,
    city: String,
    logo: String
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;

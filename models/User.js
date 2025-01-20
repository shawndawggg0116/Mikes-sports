
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  selectedTeam: { type: String, default: null }, // The user's selected team
  points: { type: Number, default: 0 },          // The user's points
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);

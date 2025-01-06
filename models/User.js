const mongoose = require('mongoose');

// Define the User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Ensures no duplicate usernames
    trim: true // Removes extra spaces
  },
  password: {
    type: String,
    required: true,
    minlength: 6 // Minimum password length
  },
  role: {
    type: String,
    enum: ['user', 'admin'], // Allows only "user" or "admin"
    default: 'user' // Default role is "user"
  },
  createdAt: {
    type: Date,
    default: Date.now // Automatically sets the creation date
  }
});

// Prevent OverwriteModelError by checking if the model already exists
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
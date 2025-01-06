
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(
  "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/?retryWrites=true&w=majority&appName=mikes-sports0new",
  { useNewUrlParser: true, useUnifiedTopology: true }
).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  selectedTeam: { type: String, default: null }, // The user's selected team
  points: { type: Number, default: 0 }          // The user's points
});

const User = mongoose.model('User', userSchema);

// Routes

// Serve the login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the registration page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Register a user
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).send('Username already exists.');

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    res.status(201).send('User registered successfully!');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user.');
  }
});

// Select a football team
app.post('/select-team', async (req, res) => {
  const { username, team } = req.body;

  if (!username || !team) {
    return res.status(400).send('Username and team are required.');
  }

  try {
    const user = await User.findOneAndUpdate(
      { username },
      { selectedTeam: team },
      { new: true } // Return updated user
    );

    if (!user) return res.status(404).send('User not found.');

    res.status(200).send(`Team selected: ${user.selectedTeam}`);
  } catch (error) {
    console.error('Error selecting team:', error);
    res.status(500).send('Error selecting team.');
  }
});

// Update points
app.post('/update-points', async (req, res) => {
  const { username, points } = req.body;

  if (!username || points === undefined) {
    return res.status(400).send('Username and points are required.');
  }

  try {
    const user = await User.findOneAndUpdate(
      { username },
      { $inc: { points } }, // Increment points
      { new: true }         // Return updated user
    );

    if (!user) return res.status(404).send('User not found.');

    res.status(200).send(`Points updated: ${user.points}`);
  } catch (error) {
    console.error('Error updating points:', error);
    res.status(500).send('Error updating points.');
  }
});

// Get user data
app.get('/user-data', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).send('Username is required.');
  }

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).send('User not found.');

    res.status(200).send({
      username: user.username,
      selectedTeam: user.selectedTeam,
      points: user.points
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data.');
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const moment = require('moment-timezone'); // Include moment-timezone

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
const JWT_SECRET = process.env.JWT_SECRET;  // Use the secret key from the environment variable
const mongoUri = process.env.MONGO_URI;     // Use the MongoDB URI from the environment variable

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schemas and Models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pickedTeams: { type: [String], default: [] },
  lastPickDate: { type: Date, default: null }
});
const User = mongoose.model('User', UserSchema, 'users');

// Middleware to authenticate API key
function authenticateAPIKey(req, res, next) {
    const apiKeyReceived = req.headers['x-rapidapi-key'];
    const validApiKey = process.env.VALID_API_KEY; // Fetch the valid API key from environment variables

    if (apiKeyReceived === validApiKey) {
        next(); // Proceed if the API key is valid
    } else {
        res.status(401).json({ error: "Unauthorized access: Invalid API key" });
    }
}

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token
  if (!token) return res.status(403).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// User Registration
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to fetch user data using User.findById
app.get('/api/get-user', authenticateToken, authenticateAPIKey, async (req, res) => {
  try {
      const user = await User.findById(req.user.id);  // Updated to use async/await
      if (!user) {
          res.status(404).json({ message: 'User not found' });
      } else {
          res.json({ pickedTeams: user.pickedTeams });
      }
  } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ message: 'Error on the server.' });
  }
});

// Additional routes and server setup continue here...

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

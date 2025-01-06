
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = "2fdb6b5a5bfafa5ede903eb75d98bc90dd61e540061ed7836a64e42d7d871b08";

mongoose.connect(
  "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/?retryWrites=true&w=majority&appName=mikes-sports0new",
  { useNewUrlParser: true, useUnifiedTopology: true }
)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const User = require('./models/User');

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).send('User not found.');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send('Invalid credentials.');
    res.send('Login successful');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Error logging in.');
  }
});

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
    console.error('Registration error:', error);
    res.status(500).send('Error registering user.');
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

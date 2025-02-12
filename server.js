require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const moment = require('moment-timezone');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// WebSocket logic
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname));
app.use(express.static('public'));

// MongoDB Connection
const JWT_SECRET = process.env.JWT_SECRET;
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
    createdAt: { type: Date, default: Date.now },
    lastPickDate: { type: Date, default: null },
    picks: { type: Object, default: {} },
    totalScore: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema, 'users');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// ✅ **Team Selection Route (Fixed)**
app.post('/api/pick-team', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            console.error("❌ User not found:", req.user.id);
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const currentWeek = moment().isoWeek().toString(); // Convert week to string for object keys
        if (!user.picks) {
            user.picks = {}; // Ensure 'picks' is initialized properly
        }

        if (user.picks[currentWeek]) {
            console.error("❌ User already picked a team this week:", user.picks[currentWeek]);
            return res.status(400).json({ success: false, message: 'You have already picked a team this week' });
        }

        // Save pick to the database
        user.picks[currentWeek] = { team: req.body.team, result: "pending" };
        user.lastPickDate = new Date();
        await user.save();

        console.log("✅ Team pick saved successfully:", user.picks);
        res.json({ success: true, message: 'Team selected successfully', picks: user.picks });
    } catch (error) {
        console.error("❌ Error selecting team:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ✅ **Fetch User Data**
app.get('/api/get-user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ username: user.username, picks: user.picks, totalScore: user.totalScore });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ **Serve Pages**
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/teams', (req, res) => res.sendFile(path.join(__dirname, 'public', 'teams.html')));
app.get('*', (req, res) => res.status(404).send('Page not found'));

// ✅ **Start Server**
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

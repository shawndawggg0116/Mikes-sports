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

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname));
app.use(express.static('public'));

// MongoDB Connection
const JWT_SECRET = process.env.JWT_SECRET;
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "user" },
    createdAt: { type: Date, default: Date.now },
    lastPickDate: { type: Date, default: null },
    picks: { type: Map, of: { team: String, result: { type: String, default: "pending" } }, default: {} },
    totalScore: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema, 'users');

// Middleware for Authentication
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

// Admin Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// ✅ Route: Register User (Admin Only)
app.post('/api/register', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, role: role || 'user' });
        await newUser.save();

        res.json({ message: `User ${username} registered successfully` });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Route: Fetch All Users (Admin Only)
app.get('/api/users', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const users = await User.find({}, '_id username');
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Route: Delete User (Admin Only)
app.delete('/api/delete-user/:id', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Route: Set Winning Teams
app.post('/api/set-winners', authenticateToken, authenticateAdmin, async (req, res) => {
    try {
        const { winners } = req.body;
        if (!winners || winners.length === 0) {
            return res.status(400).json({ message: 'No winners provided' });
        }

        const currentWeek = moment().isoWeek();
        await mongoose.connection.db.collection('winners').updateOne(
            { week: currentWeek },
            { $set: { teams: winners } },
            { upsert: true }
        );

        // Update user scores
        const users = await User.find();
        for (const user of users) {
            const userPick = user.picks?.[currentWeek]?.team;
            if (userPick && winners.includes(userPick)) {
                user.totalScore = (user.totalScore || 0) + 1;
                await user.save();
            }
        }

        res.json({ message: `Winning teams updated for Week ${currentWeek}` });
    } catch (error) {
        console.error('Error setting winners:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Route: Fetch Winning Teams
app.get('/api/get-winners', async (req, res) => {
    try {
        const currentWeek = moment().isoWeek();
        const winnerData = await mongoose.connection.db.collection('winners').findOne({ week: currentWeek });
        res.json(winnerData ? winnerData.teams : []);
    } catch (error) {
        console.error('Error fetching winners:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ✅ Route: Fetch User Data
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

// ✅ Route: User Login
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

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

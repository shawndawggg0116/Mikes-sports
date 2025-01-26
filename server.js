const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const http = require('http');
const socketio = require('socket.io');
const pug = require('pug');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const PORT = process.env.PORT || 5000;

// MongoDB connection
const mongoURI = "mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'your-strong-secret-key', // Replace with a long, random secret key
    resave: false,
    saveUninitialized: true,
  })
);

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  pickedTeams: [{ team: String, week: Number }],
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Game schema
const gameSchema = new mongoose.Schema({
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: { type: String, enum: ['upcoming', 'in_progress', 'finished'], default: 'upcoming' }
});

const Game = mongoose.model('Game', gameSchema);

// Routes

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10); 

    const newUser = new User({
      username,
      password: hashedPassword,
    });

    await newUser.save();

    req.session.user = newUser;
    res.redirect('/teams');

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    req.session.user = user;
    res.redirect('/teams');

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login'); 
  }
}

app.get('/teams', isLoggedIn, async (req, res) => {
  try {
    const allGames = await Game.find().select('homeTeam awayTeam startTime endTime status'); 
    res.render('teams', { games: allGames }); 
  } catch (error) {
    console.error('Error fetching available teams:', error);
    res.status(500).send({ success: false, message: 'Error fetching available teams.' });
  }
});

// ... (Other routes: leaderboard, rules, etc.)

app.set('views', path.join(__dirname, 'views'));

// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected');

  emitGameStatusUpdates(socket); 

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const emitGameStatusUpdates = async (socket) => {
  try {
    // Update game statuses (your logic here)
    // ... (Implement logic to update game statuses in the database)

    const allGames = await Game.find().select('homeTeam awayTeam startTime endTime status');
    socket.emit('gameStatusUpdate', allGames);

  } catch (error) {
    console.error('Error emitting game status updates:', error);
  }
};


app.get('/teams', isLoggedIn, async (req, res) => {
    try {
      // Fetch all games from the database
      const allGames = await Game.find().select('homeTeam awayTeam startTime endTime status');
  
      // Create a map of teams with their status
      const teamStatuses = {};
      allGames.forEach(game => {
        teamStatuses[game.homeTeam] = game.status;
        teamStatuses[game.awayTeam] = game.status;
      });
  
      // Create a list of all teams with status information
      const allTeams = [
        'Cardinals', 'Falcons', 'Ravens', 'Bills', 'Panthers', 'Bears', 
        'Bengals', 'Browns', 'Cowboys', 'Broncos', 'Lions', 'Packers', 
        'Texans', 'Colts', 'Jaguars', 'Titans', 'Jets', 'Dolphins', 
        'Patriots', 'Saints', 'Giants', 'Eagles', 'Vikings', 'Seahawks', 
        '49ers', 'Rams', 'Raiders', 'Chargers', 'Chiefs', 'Steelers'
      ].map(team => ({ 
        name: team, 
        status: teamStatuses[team] || 'upcoming' 
      }));
  
      res.render('teams', { teams: allTeams }); 
    } catch (error) {
      console.error('Error fetching available teams:', error);
      res.status(500).send({ success: false, message: 'Error fetching available teams.' });
    }
  });

app.get('/teams', isLoggedIn, async (req, res) => {
    try {
      const allGames = await Game.find().select('homeTeam awayTeam startTime endTime status');
      res.render('teams', { games: allGames }); // Assuming your template file is named teams.pug
    } catch (error) {
      console.error('Error fetching available teams:', error);
      res.status(500).send({ success: false, message: 'Error fetching available teams.' });
    }
  });

// ... other code

// Set Pug as the template engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); // Specify your views directory




// Start the server
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
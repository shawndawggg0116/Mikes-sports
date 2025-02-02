// Updated server.js
define(['express', 'mongoose', 'body-parser', 'jsonwebtoken', 'dotenv'], (express, mongoose, bodyParser, jwt, dotenv) => {
  dotenv.config();
  const app = express();
  app.use(bodyParser.json());

  const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    password: String,
    favoriteTeams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
    gamePicks: [
      {
        gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
        pickedTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
      }
    ]
  }));

  const Team = mongoose.model('Team', new mongoose.Schema({
    name: String,
    status: String
  }));

  const Game = mongoose.model('Game', new mongoose.Schema({
    homeTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    awayTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    startTime: Date,
    endTime: Date
  }));

  // Middleware for authentication
  const authenticate = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send('Access Denied');

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      req.user = verified;
      next();
    } catch (err) {
      res.status(400).send('Invalid Token');
    }
  };

  // Fetch teams for the logged-in user
  app.get('/api/teams', authenticate, async (req, res) => {
    try {
      const teams = await Team.find();
      res.json(teams);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching teams' });
    }
  });

  // Pick a team for the user
  app.post('/api/pick-team', authenticate, async (req, res) => {
    try {
      const { team } = req.body;
      const teamData = await Team.findOne({ name: team });
      if (!teamData) return res.status(404).json({ message: 'Team not found' });

      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.favoriteTeams.push(teamData._id);
      await user.save();

      res.json({ success: true, message: 'Team picked successfully!' });
    } catch (err) {
      res.status(500).json({ message: 'Error picking team' });
    }
  });

  // Fetch game picks for the logged-in user
  app.get('/api/user-picks', authenticate, async (req, res) => {
    try {
      const user = await User.findById(req.user._id).populate('gamePicks.gameId').populate('gamePicks.pickedTeamId');
      if (!user) return res.status(404).json({ message: 'User not found' });

      res.json(user.gamePicks);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching user picks' });
    }
  });

  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => app.listen(3000, () => console.log('Server running on port 3000')))
    .catch(err => console.log('Database connection error:', err));
});

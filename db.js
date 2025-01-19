import mongoose from 'mongoose';

const mongoURI = 'mongodb+srv://shawnbuckhannon:S8h7a6wN@mikes-sports0new.pn8ro.mongodb.net/nfl-picks-app?retryWrites=true&w=majority&appName=mikes-sports0new';

// Check if a connection already exists
if (!mongoose.connection.readyState) {
  mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
}

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

export default mongoose;

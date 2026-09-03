const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/phyto_vision_cache';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('? Connected to MongoDB');
}).catch(err => {
  console.error('? MongoDB connection error:', err);
});

module.exports = mongoose;

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'non-binary'],
    required: true
  },
  age: {
    type: Number,
    required: true,
    min: 18
  },
  // Location for proximity matching
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  // Online status for real-time presence
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  // User preferences for matching
  preferences: {
    genderPreference: {
      type: String,
      enum: ['male', 'female', 'non-binary', 'any'],
      default: 'any'
    },
    minAge: {
      type: Number,
      min: 18,
      default: 18
    },
    maxAge: {
      type: Number,
      default: 99
    }
  },
  isPremium: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Create a 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });

const User = mongoose.model('User', userSchema);

module.exports = User;

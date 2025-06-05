const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { username, password, gender, age } = req.body;

    // Basic validation
    if (!username || !password || !gender || !age) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      username,
      password: hashedPassword,
      gender,
      age,
      // Default location for new users (e.g., null or a default point)
      location: {
        type: 'Point',
        coordinates: [0, 0] // Default to [0,0] or some central point
      }
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// Login user
exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check for user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id,
        username: user.username,
        gender: user.gender,
        age: user.age
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// Update user location
exports.updateUserLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id; // From auth middleware

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ message: 'Invalid latitude or longitude.' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude] // GeoJSON stores as [longitude, latitude]
        },
        lastActive: new Date() // Update last active time
      },
      { new: true } // Return the updated document
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'Location updated successfully!', location: user.location });
  } catch (error) {
    console.error('Error updating user location:', error);
    res.status(500).json({ message: 'Server error updating location.' });
  }
};

// Update user profile (gender, age, preferences)
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body; // Contains gender, age, preferences.genderPreference, minAge, maxAge

    const updateFields = {};
    if (updates.gender) updateFields.gender = updates.gender;
    if (updates.age) updateFields.age = updates.age;

    // Update preferences sub-document
    if (updates.genderPreference || updates.minAge || updates.maxAge) {
      updateFields['preferences.genderPreference'] = updates.genderPreference || 'any';
      updateFields['preferences.minAge'] = updates.minAge || 18;
      updateFields['preferences.maxAge'] = updates.maxAge || 99;
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updateFields }, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'Profile updated successfully!', user });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
};


// Get nearby strangers based on location and preferences
exports.getNearbyStrangers = async (req, res) => {
  try {
    const userId = req.user.id; // User making the request
    const { maxDistanceKm = 1 } = req.query; // Max distance in kilometers, default 1km

    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.location || !currentUser.location.coordinates || currentUser.location.coordinates.length !== 2) {
      return res.status(400).json({ message: 'Current user location not set.' });
    }

    const [lon, lat] = currentUser.location.coordinates;
    const maxDistanceMeters = parseFloat(maxDistanceKm) * 1000; // Convert km to meters

    const query = {
      _id: { $ne: userId }, // Exclude current user
      isOnline: true, // Only show online users
      'location.coordinates': {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: maxDistanceMeters
        }
      }
    };

    // Apply gender preference filter
    if (currentUser.preferences && currentUser.preferences.genderPreference && currentUser.preferences.genderPreference !== 'any') {
      query.gender = currentUser.preferences.genderPreference;
    }

    // Apply age preference filter
    if (currentUser.preferences && currentUser.preferences.minAge && currentUser.preferences.maxAge) {
      query.age = {
        $gte: currentUser.preferences.minAge,
        $lte: currentUser.preferences.maxAge
      };
    }

    const strangers = await User.find(query);

    // Calculate distance for each stranger and format response
    const formattedStrangers = strangers.map(stranger => {
      // Haversine formula or simply use the distance from $nearSphere if available
      // Mongoose $nearSphere automatically sorts by distance, distance field is usually available
      // but if not, a simple calculation can be done or rely on the sort.
      // For simplicity, we'll re-calculate distance for display if needed.
      const dist = calculateDistance(lat, lon, stranger.location.coordinates[1], stranger.location.coordinates[0]);

      return {
        _id: stranger._id,
        username: stranger.username,
        isPremium: stranger.isPremium,
        gender: stranger.gender,
        age: stranger.age,
        lastActive: stranger.lastActive,
        isOnline: stranger.isOnline,
        distance: dist // distance in meters
      };
    });

    res.status(200).json(formattedStrangers);
  } catch (error) {
    console.error('Error getting nearby strangers:', error);
    res.status(500).json({ message: 'Server error fetching nearby strangers.' });
  }
};


// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const d = R * c; // in metres
    return d;
}
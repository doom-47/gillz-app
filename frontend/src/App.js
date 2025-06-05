import React, { useState, useEffect } from 'react';
import { registerUser, loginUser, updateLocation, updateProfile, getNearbyStrangers } from './services/api';
import { io } from 'socket.io-client'; // Import socket.io-client

const socket = io('http://localhost:5050'); // Connect to your backend Socket.IO server

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [message, setMessage] = useState('');
  const [nearbyStrangers, setNearbyStrangers] = useState([]);
  const [userId, setUserId] = useState(localStorage.getItem('userId')); // Get userId from local storage

  useEffect(() => {
    // Check if token and userId exist to determine initial login state
    if (localStorage.getItem('token') && localStorage.getItem('userId')) {
      setIsLoggedIn(true);
      setUserId(localStorage.getItem('userId'));
    }

    // Socket.IO connection and online status handling
    socket.on('connect', () => {
      console.log('Connected to Socket.IO server:', socket.id);
      if (userId) { // Emit set_online if userId is available
        socket.emit('set_online', userId);
        console.log(`Emitting set_online for userId: ${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    socket.on('status_updated', (data) => {
      console.log('Online status updated by server:', data);
    });

    socket.on('error', (data) => {
      console.error('Socket error:', data.message);
    });

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('status_updated');
      socket.off('error');
    };
  }, [userId, isLoggedIn]); // Re-run effect if userId or isLoggedIn changes

  const handleRegister = async () => {
    try {
      const res = await registerUser({ username, password, gender, age: parseInt(age) });
      setMessage(res.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Registration failed.');
    }
  };

  const handleLogin = async () => {
    try {
      const res = await loginUser({ username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user.id); // Store userId
      setUserId(res.data.user.id);
      setIsLoggedIn(true);
      setMessage('Login successful!');
      socket.emit('set_online', res.data.user.id); // Set online immediately after login
    } catch (error) {
      setMessage(error.response?.data?.message || 'Login failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    setUserId(null);
    setMessage('Logged out.');
    // When a user logs out, they are considered offline from a client perspective.
    // The server will handle this on socket disconnect.
    socket.disconnect(); // Disconnect socket to trigger server-side offline
    socket.connect(); // Reconnect socket for next login/registration
  };

  const handleUpdateLocation = async () => {
    // For demo, hardcode a location in Mumbai
    const latitude = 19.0765;
    const longitude = 72.8780;
    try {
      const res = await updateLocation({ latitude, longitude });
      setMessage(res.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Location update failed.');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const profileData = {
        gender: 'male', // Example: you'd get this from input fields
        age: 25,
        genderPreference: 'female',
        minAge: 20,
        maxAge: 35
      };
      const res = await updateProfile(profileData);
      setMessage(res.data.message);
      console.log('Updated Profile:', res.data.user);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Profile update failed.');
    }
  };

  const handleFindStrangers = async () => {
    try {
      const res = await getNearbyStrangers({ maxDistanceKm: 1 });
      setNearbyStrangers(res.data);
      setMessage(`Found ${res.data.length} nearby strangers.`);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to find strangers.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Gillz Frontend</h1>
      <p style={{ color: 'red' }}>{message}</p>

      {!isLoggedIn ? (
        <div>
          <h2>Register / Login</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ margin: '5px', padding: '8px' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ margin: '5px', padding: '8px' }}
          />
          <input
            type="text"
            placeholder="Gender (male/female/non-binary)"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={{ margin: '5px', padding: '8px' }}
          />
          <input
            type="number"
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            style={{ margin: '5px', padding: '8px' }}
          />
          <br />
          <button onClick={handleRegister} style={{ margin: '5px', padding: '10px', cursor: 'pointer' }}>Register</button>
          <button onClick={handleLogin} style={{ margin: '5px', padding: '10px', cursor: 'pointer' }}>Login</button>
        </div>
      ) : (
        <div>
          <h2>Welcome, {username || 'User'}!</h2>
          <button onClick={handleLogout} style={{ margin: '5px', padding: '10px', cursor: 'pointer' }}>Logout</button>
          <button onClick={handleUpdateLocation} style={{ margin: '5px', padding: '10px', cursor: 'pointer' }}>Update My Location</button>
          <button onClick={handleUpdateProfile} style={{ margin: '5px', padding: '10px', cursor: 'pointer' }}>Update My Profile (Gender/Pref)</button>
          <button onClick={handleFindStrangers} style={{ margin: '5px', padding: '10px', cursor: 'pointer' }}>Find Nearby Strangers</button>

          {nearbyStrangers.length > 0 && (
            <div>
              <h3>Nearby Strangers:</h3>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {nearbyStrangers.map((stranger) => (
                  <li key={stranger._id} style={{ border: '1px solid #ccc', padding: '10px', margin: '5px 0' }}>
                    <strong>{stranger.username}</strong> ({stranger.gender}, {stranger.age}) - {stranger.distance.toFixed(2)} meters away - {stranger.isOnline ? 'Online' : 'Offline'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5050/api', // Your backend URL
});

// Add a request interceptor to include the token in all requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Get token from local storage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});


export const registerUser = (userData) => API.post('/users/register', userData);
export const loginUser = (credentials) => API.post('/users/login', credentials);
export const updateLocation = (locationData) => API.post('/users/update-location', locationData);
export const updateProfile = (profileData) => API.post('/users/update-profile', profileData);
export const getNearbyStrangers = (params) => API.get('/users/nearby-strangers', { params });

// You'll add more functions here for chat, likes, etc.
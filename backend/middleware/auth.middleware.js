const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied.' });
  }

  try {
    // Tokens come as "Bearer <token>", so we split to get the actual token part
    const actualToken = token.split(' ')[1];
    if (!actualToken) {
      return res.status(401).json({ message: 'Token format is incorrect.' });
    }

    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
    req.user = decoded; // Attach user payload (e.g., { id: userId }) to the request
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid.' });
  }
};
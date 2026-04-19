const jwt = require('jsonwebtoken');
const User = require('../models/User');

// For HTTP routes
const authenticateHTTP = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password -refreshTokens');
        if (!user) return res.status(401).json({ message: 'User not found' });

        req.user = user;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// For WebSocket connections
const authenticateWS = async (token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -refreshTokens');
    if (!user) throw new Error('User not found');
    return user;
};

module.exports = { authenticateHTTP, authenticateWS };
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateHTTP } = require('../middleware/auth');

const router = express.Router();

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
    );
    return { accessToken, refreshToken };
};

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password)
            return res.status(400).json({ message: 'All fields are required' });

        const exists = await User.findOne({ $or: [{ email }, { username }] });
        if (exists)
            return res.status(400).json({ message: 'Username or email already taken' });

        const user = new User({ username, email, password });
        await user.save();

        const { accessToken, refreshToken } = generateTokens(user._id);
        user.refreshTokens.push(refreshToken);
        await user.save();

        res.status(201).json({
            accessToken,
            refreshToken,
            user: { userId: user._id, username: user.username, email: user.email },
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password)))
            return res.status(401).json({ message: 'Invalid email or password' });

        const { accessToken, refreshToken } = generateTokens(user._id);
        user.refreshTokens.push(refreshToken);
        await user.save();

        res.json({
            accessToken,
            refreshToken,
            user: { userId: user._id, username: user.username, email: user.email },
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || !user.refreshTokens.includes(refreshToken))
            return res.status(401).json({ message: 'Invalid refresh token' });

        // Rotate token
        user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
        const { accessToken, refreshToken: newRefresh } = generateTokens(user._id);
        user.refreshTokens.push(newRefresh);
        await user.save();

        res.json({ accessToken, refreshToken: newRefresh });
    } catch {
        res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.userId);
        if (user) {
            user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
            await user.save();
        }
        res.json({ message: 'Logged out successfully' });
    } catch {
        res.json({ message: 'Logged out' });
    }
});

// Get current user
router.get('/me', authenticateHTTP, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
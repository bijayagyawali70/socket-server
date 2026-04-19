const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('V Connected to MongoDB');
    } catch (err) {
        console.error('X MongoDB connection error:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const socketHandler = require('./socket/socketHandler');

// ── App setup ─────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Server ────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

socketHandler(wss);

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`HTTP → http://localhost:${PORT}`);
        console.log(`WS   → ws://localhost:${PORT}`);
    });
});
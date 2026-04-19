const WebSocket = require('ws');
const Message = require('../models/Message');
const { authenticateWS } = require('../middleware/auth');

const onlineUsers = {};

const socketHandler = (wss) => {
  wss.on('connection', async (ws, req) => {
    // ── Auth ──────────────────────────────────────────────
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'No token provided');
      return;
    }

    let user;
    try {
      user = await authenticateWS(token);
    } catch {
      ws.close(1008, 'Unauthorized');
      return;
    }

    ws.userId = user._id.toString();
    ws.username = user.username;
    onlineUsers[ws.userId] = ws;

    console.log(`${user.username} connected`);

    // ── Send message history ──────────────────────────────
    const previousMessages = await Message.find()
      .sort({ timeStamp: 1 })
      .limit(50);

    ws.send(JSON.stringify({
      type: 'history',
      messages: previousMessages.map(m => ({
        text: m.text,
        username: m.username,
        timeStamp: m.timeStamp,
      })),
    }));

    // ── Receive message ───────────────────────────────────
    ws.on('message', async (msg) => {
      let parsed;
      try {
        parsed = JSON.parse(msg.toString());
      } catch {
        parsed = { text: msg.toString() };
      }

      const text = parsed.text?.trim();
      if (!text) return;

      console.log(`${ws.username}: ${text}`);

      const newMsg = new Message({ text, sender: ws.userId, username: ws.username });
      await newMsg.save();

      // Broadcast to everyone
      const payload = JSON.stringify({
        type: 'message',
        text,
        username: ws.username,
        timeStamp: newMsg.timeStamp,
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    });

    // ── Disconnect ────────────────────────────────────────
    ws.on('close', () => {
      delete onlineUsers[ws.userId];
      console.log(`${ws.username} disconnected`);
    });
  });
};

module.exports = socketHandler;
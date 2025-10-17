const WebSocket = require("ws");
const mongoose = require('mongoose');


//connect to mongodb
mongoose.connect("mongodb://127.0.0.1:27017/chatdb")

const db = mongoose.connection;
db.on("error", console.error.bind(console, "X MongoDB connection error:" ))
db.once("open", () => console.log('V Connected to MongoDB'));


//message schema
const messageSchema = new mongoose.Schema({
    text: String,
    timeStamp: { type: Date, default: Date.now }
})


const Message = mongoose.model('Message', messageSchema);


//start web socket server
const wss = new WebSocket.Server({port: 3000}, () => console.log('Web socket server is running at ws:3000}'))
    

//when client connects
wss.on('connection', async(ws) => {
    console.log("new client connected ")

    //send previous messages
    const previousMessage = await Message.find().sort({timeStamp : 1});
    previousMessage.forEach((msg) => ws.send(msg.text));




    //when server recieve a message
    ws.on('message', async(msg) => {
        console.log('received message :', msg.toString());
      
        
        const newMsg = new Message({text: msg.toString()});
        await newMsg.save()


        //broadcast to all clients
        wss.clients.forEach((client) => {
            if(client.readyState === WebSocket.OPEN) {
                client.send(msg.toString());
            }
        })
    })



    ws.on('close', () => {
        console.log("client disconnected")
    })


})  



const WebSocket = require("ws")


//start web socket server
const wss = new WebSocket.Server({port: 3000}, () => console.log('Web socket server is running at ws:3000}'))


//when client connects
wss.on('connection', (ws) => {
    console.log("new client connected ")

    //when server recieve a message
    ws.on('message', (msg) => {
        console.log('received message :', msg)
        //echo message back to client
        ws.send(`server says : ${msg}` )
    })



    ws.on('close', () => {
        console.log("client disconnected")
    })


})  



let socket;
let serverAddress = null;
let serverSocket = 'wss://web.libera.chat/webirc/websocket/';
const reconnectInterval = 5000; // 5 seconds

let pingInterval = 30000; // 60 seconds
let pingTimer;
let logIRC = false;

let nickname = 'ez_' + (Date.now() + Math.floor(Math.random() * 1000)).toString(16);

async function connect() {
  socket = new WebSocket(serverSocket);

  socket.addEventListener('open', onOpen);
  socket.addEventListener('message', onMessage);
  socket.addEventListener('error', onError);
  socket.addEventListener('close', onClose);
}

function onOpen() {
  console.clear();
  console.log('Connection opened.');
  socket.send(`NICK ${nickname}`);
  socket.send('USER 0 0 0 :'+nickname+' Bot');
  socket.send('JOIN #EasyRPG_test');
}

async function onMessage(event) {
  const line = event.data;
  
  if (serverAddress == null){ 
    serverAddress = line.split(":")[1].split(" ")[0];
    console.log("Server Address: " + serverAddress);
    startPingPong();
}  
  
let msgTypes = [
    "NOTICE", "PONG", 250, 251, 252, 253, 254, 255, 265, 266, 372, 375, 376,  
];

for (let id of msgTypes) 
    if (line.startsWith(":" + serverAddress + " "+ id +" ") && !logIRC){
        if(id !== "PONG") await FileOperations.updateFile(" \\C[4] " + id +" - \\C[1]CONNECTING...", "Text/test.txt");   
        return;
    }

   console.log('Received:', line);
    if(line.includes("JOIN")) await FileOperations.updateFile(" \\C[4] CONNECTED", "Text/test.txt");   

    if(line.includes("PRIVMSG")){
let user = " \\C[4]< " + line.split(":")[1].split("[")[0] + " >";
let msg = " \\C[0] " + line.split("PRIVMSG")[1].split(":")[1];
    
await FileOperations.updateFile(user + "\n"+ msg, "Text/test.txt");   
    }
    
  // Add more message handling logic here
}

function onError(error) {
  console.error('WebSocket error:', error);
}

function onClose(event) {
  console.log('Connection closed:', event);
  stopPingPong();
  serverAddress = null;
  setTimeout(connect, reconnectInterval);
}

function startPingPong() {
  pingTimer = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      const ping = `PING ${serverAddress}`;
      socket.send(ping);
     if(logIRC) console.log('Sent:', ping);
    }
  }, pingInterval);
}

function stopPingPong() {
  clearInterval(pingTimer);
}


console.log("IRC client setup complete.");

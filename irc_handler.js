let socket;
let serverAddress = null;
let serverSocket = 'wss://web.libera.chat/webirc/websocket/';
const reconnectInterval = 5000; // 5 seconds

let pingInterval = 30000; // 60 seconds
let pingTimer;
let logIRC = false;

let nickname = 'ez_' + (Date.now() + Math.floor(Math.random() * 1000)).toString(16);

let user = "";
let msg = "";
let lastUser = '';
let repeatUserCounter = 0;
let mergedMessage = '';
let userLastMessageTime = {};
const COOLDOWN_TIME = 5000; 

function splitStringByLength(str, length = 50) {
    const segments = str.split('\n');
    const result = segments.map(segment => {
      const words = segment.split(' ');
      let lines = [];
      let currentLine = '';
  
      words.forEach(word => {
        if ((currentLine + word).length <= length) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      });
  
      if (currentLine) {
        lines.push(currentLine);
      }
  
      return lines.join('\n');
    });
  
    return result.join('\n');
  }

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
  socket.send('JOIN #easyrpg');
  socket.send('JOIN #make_him_walk');
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
    if(line.includes("JOIN") && line.includes(nickname)) await FileOperations.updateFile(" \\C[4] CONNECTED", "Text/test.txt");   

    // vars were declared outside, on the root of the code
    if (line.includes("PRIVMSG")) {
        // Extract the username
        const currentUser = line.split("!")[0].split(":")[1];
        user = "\\C[4]< " + currentUser + " >";
        
        // Find the position of "PRIVMSG" and the next colon after it
        let privmsgIndex = line.indexOf("PRIVMSG");
        let messageStartIndex = line.indexOf(":", privmsgIndex);
        
        // Extract the message, keeping all subsequent colons
        msg = "\\C[0]" + line.slice(messageStartIndex + 1);
        
        const currentTime = Date.now();
        
        // Check if it's a new user or if the cooldown time has passed
        if (currentUser !== lastUser || (userLastMessageTime[currentUser] && currentTime - userLastMessageTime[currentUser] > COOLDOWN_TIME)) {
            // If there's a previous merged message, write it
            if (mergedMessage) {
                let splitMergedMessage = splitStringByLength(mergedMessage);
                await FileOperations.updateFile("\\C[4]< " + lastUser + " >\n" + splitMergedMessage, "Text/test.txt");
            }
            
            // Reset for the new user or after cooldown
            lastUser = currentUser;
            repeatUserCounter = 1;
            mergedMessage = msg;
        } else {
            // Same user within cooldown, increment counter and append message
            repeatUserCounter++;
            mergedMessage += "\n" + msg;
            
            // If we've reached 11 messages, reset the counter and merged message
            if (repeatUserCounter === 11 || /!(up|down|left|right)/.test(msg)) {
                repeatUserCounter = 0;
                let splitMergedMessage = splitStringByLength(mergedMessage);
                await FileOperations.updateFile(user + "\n" + splitMergedMessage, "Text/test.txt");
                mergedMessage = msg;
            }
        }
        
        // Update the last message time for the current user
        userLastMessageTime[currentUser] = currentTime;
        
        // Always write the current state of the merged message
        let splitCurrentMessage = splitStringByLength(mergedMessage);
        await FileOperations.updateFile(user + "\n" + splitCurrentMessage, "Text/test.txt");
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

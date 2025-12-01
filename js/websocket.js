
function createWebSocketConnection(onOpen, onClose, onMessage) {
  const ws = new WebSocket(BRIDGE_URL);
  
  ws.onopen = () => {
    onOpen(ws);
    ws.send(JSON.stringify({ token: TOKEN, command: 'LOAD' }));
  };
  
  ws.onclose = onClose;
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  return ws;
}

function sendWebSocketCommand(socket, command, data = {}) {
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify({ 
      token: TOKEN, 
      command, 
      ...data 
    }));
  }
}
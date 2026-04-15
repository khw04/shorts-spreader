const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { createServerRuntime } = require('./src/lib/server-runtime');

const dev = process.env.NODE_ENV === 'development';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ server });
  const runtime = createServerRuntime({ wss });

  runtime.startHeartbeat();

  wss.on('connection', (socket, request) => {
    runtime.handleConnection(socket, request);

    socket.on('message', (rawMessage) => {
      runtime.handleMessage(socket, rawMessage);
    });

    socket.on('close', (code, reasonBuffer) => {
      const reason = typeof reasonBuffer?.toString === 'function' ? reasonBuffer.toString() : '';
      console.warn('[ws] socket.onclose', {
        socketId: socket.__debugSocketId || 'socket-unknown',
        clientId: socket.clientMeta?.clientId || 'unregistered',
        role: socket.clientMeta?.role || 'unknown',
        code: code ?? 'unknown',
        reason: reason || 'no_reason'
      });
      runtime.handleClose(socket);
    });
  });

  server.on('close', () => {
    runtime.stopHeartbeat();
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}).catch((error) => {
  console.error('Failed to start bootstrap server.', error);
  process.exit(1);
});

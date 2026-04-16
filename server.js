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

  const wss = new WebSocketServer({ noServer: true });
  const runtime = createServerRuntime({ wss });

  runtime.startHeartbeat();

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);

    if (pathname === '/ws' || pathname === '/ws/') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (socket) => {
    runtime.handleConnection(socket);

    socket.on('message', (rawMessage) => {
      runtime.handleMessage(socket, rawMessage);
    });

    socket.on('close', () => {
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

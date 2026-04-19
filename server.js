const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { createServerRuntime } = require('./src/lib/server-runtime');

const dev = process.env.NODE_ENV === 'development';
const hostname = '0.0.0.0';
const port = Number(process.env.PORT || 3000);

const BLOCKED_IPS = new Set([
  '175.198.92.228'
]);

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_MESSAGES = 30;
const rateLimitMap = new Map();

function getClientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.socket?.remoteAddress || '';
}

function isRateLimited(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimitMap.set(ip, entry);
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_MESSAGES;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

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

    if (pathname !== '/ws' && pathname !== '/ws/') {
      socket.destroy();
      return;
    }

    const ip = getClientIp(request);

    if (BLOCKED_IPS.has(ip)) {
      console.warn(`[blocked] IP ${ip} rejected`);
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws._clientIp = ip;
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (socket) => {
    runtime.handleConnection(socket);

    socket.on('message', (rawMessage) => {
      const ip = socket._clientIp || '';
      if (ip && isRateLimited(ip)) {
        console.warn(`[rate-limit] IP ${ip} exceeded ${RATE_LIMIT_MAX_MESSAGES} msgs/${RATE_LIMIT_WINDOW_MS}ms`);
        return;
      }
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

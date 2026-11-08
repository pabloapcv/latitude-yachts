import { createServer } from 'node:http';
import { POST, OPTIONS } from '../api/chat.ts';

const port = Number(process.env.PORT || 3001);

function incomingToRequest(req, body) {
  const host = req.headers.host || `127.0.0.1:${port}`;
  const url = `http://${host}${req.url || '/'}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : String(value));
  }
  const method = req.method || 'GET';
  const init = { method, headers };
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && body.length) {
    init.body = body;
  }
  return new Request(url, init);
}

const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  try {
    const request = incomingToRequest(req, body);
    const path = new URL(request.url).pathname;
    if (path !== '/api/chat' && path !== '/chat') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    const response = request.method === 'OPTIONS' ? OPTIONS(request) : await POST(request);
    const headers = Object.fromEntries(response.headers.entries());
    res.writeHead(response.status, headers);
    if (!response.body) {
      res.end();
      return;
    }
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Server error' }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Latitude25 chat API on http://127.0.0.1:${port}/api/chat`);
  console.log(`MOCK_CHAT=${process.env.MOCK_CHAT || ''} model=${process.env.AI_GATEWAY_MODEL || 'google/gemini-3.5-flash-lite'}`);
});

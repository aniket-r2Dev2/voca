const http = require('node:http');
const { timingSafeEqual } = require('node:crypto');
const { RelayError, INPUT_BYTES, validateInput, generate } = require('./provider.cjs');

function createRelay({ token, models, origin = 'http://localhost:3000', fetchImpl = fetch, timeoutMs = 60000, maxRequests = 6 }) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32,256}$/.test(token)) throw new Error('Set VOCA_RELAY_TOKEN to a random token of 32–256 URL-safe characters.');
  if (!Array.isArray(models) || !models.length || !models.every(model => /^[a-zA-Z0-9._-]{1,100}$/.test(model))) throw new Error('Set VOCA_MODELS to a comma-separated list of supported OpenAI model IDs.');
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error('VOCA_ORIGIN must be a local HTTP development origin.');
  let active = false; let windowStart = Date.now(); let count = 0;
  const expected = Buffer.from(`Bearer ${token}`);
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body) => {
      if (!res.destroyed) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); }
    };
    // Restrict Host as well as Origin to reject DNS-rebinding requests.
    if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host || '')) return send(403, { error: 'host_not_allowed' });
    if (req.headers.origin && req.headers.origin !== origin) return send(403, { error: 'origin_not_allowed' });
    if (req.headers.origin === origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    if (!['/api/tailor', '/api/capabilities'].includes(req.url)) return send(404, { error: 'not_found' });
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Provider-Key');
      return send(204, undefined);
    }
    if (req.method !== (req.url === '/api/capabilities' ? 'GET' : 'POST')) return send(405, { error: 'method_not_allowed' });
    const authorization = Buffer.from(req.headers.authorization || '');
    if (authorization.length !== expected.length || !timingSafeEqual(authorization, expected)) return send(401, { error: 'unauthorized' });
    if (req.url === '/api/capabilities') return send(200, { provider: 'openai', models });
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type'] || '')) return send(415, { error: 'json_required' });
    const key = req.headers['x-provider-key'];
    if (typeof key !== 'string' || !/^[\x21-\x7e]{10,512}$/.test(key)) return send(400, { error: 'provider_key_required' });
    if (Number(req.headers['content-length']) > INPUT_BYTES) return send(413, { error: 'request_too_large' });
    if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); count = 0; }
    if (active || count >= maxRequests) return send(429, { error: 'relay_busy_or_rate_limited' });
    active = true; count += 1;
    const controller = new AbortController(); let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); req.emit('relayTimeout'); }, timeoutMs);
    const disconnect = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', disconnect);
    try {
      // Event-based body reader keeps the socket open long enough to send a bounded error.
      const raw = await new Promise((resolve, reject) => {
        let size = 0; const chunks = [];
        const cleanup = () => {
          req.off('data', data); req.off('end', end); req.off('error', error);
          req.off('aborted', aborted); req.off('relayTimeout', timeout);
        };
        const stop = error => { cleanup(); reject(error); };
        const data = chunk => {
          size += chunk.length;
          if (size > INPUT_BYTES) { req.resume(); stop(new RelayError(413, 'request_too_large')); }
          else chunks.push(chunk);
        };
        const end = () => { cleanup(); resolve(Buffer.concat(chunks).toString('utf8')); };
        const error = () => stop(new RelayError(400, 'invalid_request'));
        const aborted = () => stop(new RelayError(400, 'request_cancelled'));
        const timeout = () => stop(new RelayError(504, 'request_timeout'));
        req.on('data', data); req.on('end', end); req.on('error', error); req.on('aborted', aborted); req.on('relayTimeout', timeout);
      });
      let input;
      try { input = JSON.parse(raw); } catch { throw new RelayError(400, 'invalid_json'); }
      validateInput(input, models);
      const result = await generate(input, key, controller.signal, fetchImpl);
      send(200, result);
    } catch (error) {
      if (timedOut) send(504, { error: 'request_timeout' });
      else if (error instanceof RelayError) send(error.status, { error: error.code });
      else send(502, { error: 'provider_connection_failed' });
    } finally {
      clearTimeout(timer); res.off('close', disconnect); active = false;
    }
  });
  server.requestTimeout = 65000;
  server.headersTimeout = 10000;
  server.timeout = 70000;
  server.maxHeadersCount = 30;
  return server;
}
if (require.main === module) {
  try {
    const server = createRelay({ token: process.env.VOCA_RELAY_TOKEN, models: (process.env.VOCA_MODELS || '').split(',').filter(Boolean), origin: process.env.VOCA_ORIGIN });
    const port = Number(process.env.VOCA_PORT || 8787);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('VOCA_PORT must be 1024–65535.');
    server.on('error', () => { console.error('Relay could not listen on its local port.'); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => console.log(`Voca local relay listening at http://127.0.0.1:${port}`));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { createRelay };

import { Buffer } from 'node:buffer';
import { timingSafeEqual } from 'node:crypto';
import provider from '../server/provider.cjs';
const { RelayError, INPUT_BYTES, validateInput, generate } = provider;

async function readBody(request, signal) {
  const reader = request.body.getReader(); const chunks = []; let size = 0;
  const cancel = () => { reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > INPUT_BYTES) throw new RelayError(413, 'request_too_large');
      chunks.push(Buffer.from(value));
    }
    if (signal.aborted) throw new RelayError(499, 'request_cancelled');
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {}); reader.releaseLock();
  }
}

// Exported factory permits deterministic tests without a paid provider request.
export function createWorker(fetchImpl = fetch, timeoutMs = 60000) {
  return { async fetch(request, env) {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' };
    const send = (status, body) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    if (origin === env.VOCA_ORIGIN) headers['Access-Control-Allow-Origin'] = origin;
    if (url.protocol !== 'https:') return send(403, { error: 'https_required' });
    if (origin && origin !== env.VOCA_ORIGIN) return send(403, { error: 'origin_not_allowed' });
    if (url.search || !['/api/capabilities', '/api/tailor'].includes(url.pathname)) return send(404, { error: 'not_found' });
    if (request.method === 'OPTIONS') {
      headers['Access-Control-Allow-Methods'] = 'GET, POST';
      headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-Provider-Key';
      return send(204);
    }
    const models = (env.VOCA_MODELS || '').split(',').filter(Boolean);
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(env.VOCA_RELAY_TOKEN || '') ||
        !/^https:\/\/[^/?#]+$/.test(env.VOCA_ORIGIN || '') || !models.length ||
        !models.every(model => /^[a-zA-Z0-9._-]{1,100}$/.test(model)) || !env.VOCA_RATE_LIMIT?.limit) return send(503, { error: 'relay_not_configured' });
    const actual = Buffer.from(request.headers.get('Authorization') || '');
    const expected = Buffer.from(`Bearer ${env.VOCA_RELAY_TOKEN}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return send(401, { error: 'unauthorized' });
    if (request.method !== (url.pathname === '/api/capabilities' ? 'GET' : 'POST')) return send(405, { error: 'method_not_allowed' });
    if (url.pathname === '/api/capabilities') return send(200, { provider: 'openai', models });
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type') || '')) return send(415, { error: 'json_required' });
    const key = request.headers.get('X-Provider-Key');
    if (!/^[\x21-\x7e]{10,512}$/.test(key || '')) return send(400, { error: 'provider_key_required' });
    if (Number(request.headers.get('Content-Length')) > INPUT_BYTES) return send(413, { error: 'request_too_large' });
    const controller = new AbortController(); let timedOut = false;
    const abort = () => controller.abort();
    request.signal.addEventListener('abort', abort, { once: true });
    if (request.signal.aborted) abort();
    let timer;
    // Race bounds even a stalled upload; the provider fetch receives the same abort signal.
    const interrupted = new Promise((resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(new RelayError(timedOut ? 504 : 499, timedOut ? 'request_timeout' : 'request_cancelled')), { once: true });
      if (controller.signal.aborted) reject(new RelayError(499, 'request_cancelled'));
      timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    });
    try {
      const operation = async () => {
        const { success } = await env.VOCA_RATE_LIMIT.limit({ key: 'voca-beta-generation' });
        if (!success) throw new RelayError(429, 'relay_busy_or_rate_limited');
        if (!request.body) throw new RelayError(400, 'invalid_request');
        const raw = await readBody(request, controller.signal);
        if (controller.signal.aborted) throw new RelayError(499, 'request_cancelled');
        let input;
        try { input = JSON.parse(raw); } catch { throw new RelayError(400, 'invalid_json'); }
        validateInput(input, models);
        return generate(input, key, controller.signal, fetchImpl);
      };
      const result = await Promise.race([operation(), interrupted]);
      return send(200, result);
    } catch (error) {
      if (timedOut) return send(504, { error: 'request_timeout' });
      if (request.signal.aborted) return send(499, { error: 'request_cancelled' });
      if (error instanceof RelayError) return send(error.status, { error: error.code });
      return send(502, { error: 'provider_connection_failed' });
    } finally {
      clearTimeout(timer); request.signal.removeEventListener('abort', abort);
      // Releasing a timed-out body prevents its reader continuing after the response.
      if (controller.signal.aborted && request.body && !request.body.locked) await request.body.cancel().catch(() => {});
    }
  } };
}
export default createWorker();

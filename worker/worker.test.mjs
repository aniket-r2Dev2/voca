import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from './index.mjs';
const token = 't'.repeat(48);
const input = { requestId: 'id', model: 'test-model', jobDescription: 'Build services', evidence: [{ path: 'profile.summary', quote: 'Built services.' }] };
const proposal = { requestId: 'id', proposed: 'Built services.', reason: 'Relevant', evidence: input.evidence[0] };
const env = () => ({ VOCA_RELAY_TOKEN: token, VOCA_ORIGIN: 'https://aniket-r2dev2.github.io', VOCA_MODELS: 'test-model', VOCA_RATE_LIMIT: { limit: async () => ({ success: true }) } });
function request(body = input, options = {}) {
  return new Request('https://voca-relay.example.workers.dev/api/tailor', { method: 'POST', headers: { Origin: env().VOCA_ORIGIN, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Provider-Key': 'test-api-key' }, body: JSON.stringify(body), ...options });
}
function fixture() {
  const calls = [];
  const worker = createWorker(async (...args) => { calls.push(args); return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(proposal) }] }] }); });
  return { calls, worker };
}
test('Worker reuses validated OpenAI proposal contract, never forwards relay token', async () => {
  const { worker, calls } = fixture(); const response = await worker.fetch(request(), env());
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), proposal);
  assert.equal(response.headers.get('access-control-allow-origin'), env().VOCA_ORIGIN);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 'https://api.openai.com/v1/responses');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer test-api-key');
  assert.ok(!JSON.stringify(calls).includes(token));
});
test('fails closed for missing configuration, unauthorized origins/keys and oversize input', async () => {
  const { worker, calls } = fixture();
  for (const patch of [{ VOCA_RELAY_TOKEN: '' }, { VOCA_MODELS: '' }, { VOCA_RATE_LIMIT: null }, { VOCA_ORIGIN: 'http://example.com' }]) assert.equal((await worker.fetch(request(), { ...env(), ...patch })).status, [patch.VOCA_ORIGIN].includes('http://example.com') ? 403 : 503);
  assert.equal((await worker.fetch(request(input, { headers: { Origin: 'https://evil.example' } }), env())).status, 403);
  assert.equal((await worker.fetch(request(input, { headers: {} }), env())).status, 401);
  assert.equal((await worker.fetch(request({ ...input, endpoint: 'https://evil.example' }), env())).status, 400);
  assert.equal((await worker.fetch(request('x'.repeat(50000)), env())).status, 413);
  assert.equal(calls.length, 0);
});
test('authenticated capabilities and CORS preflight never call the provider', async () => {
  const { worker, calls } = fixture();
  const url = 'https://voca-relay.example.workers.dev/api/capabilities';
  assert.equal((await worker.fetch(new Request(url), env())).status, 401);
  const reply = await worker.fetch(new Request(url, { headers: { Authorization: `Bearer ${token}` } }), env());
  assert.deepEqual(await reply.json(), { provider: 'openai', models: ['test-model'] });
  const preflight = await worker.fetch(new Request(url, { method: 'OPTIONS', headers: { Origin: env().VOCA_ORIGIN } }), env());
  assert.equal(preflight.status, 204); assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
  assert.equal(calls.length, 0);
});
test('rate limiting fails closed without any provider retry or leaked error', async () => {
  const { worker, calls } = fixture();
  const blocked = { ...env(), VOCA_RATE_LIMIT: { limit: async () => ({ success: false }) } };
  assert.equal((await worker.fetch(request(), blocked)).status, 429);
  blocked.VOCA_RATE_LIMIT.limit = async () => { throw new Error('secret internal detail'); };
  const reply = await worker.fetch(request(), blocked);
  assert.equal(reply.status, 502); assert.ok(!(await reply.text()).includes('secret')); assert.equal(calls.length, 0);
});
test('deadline cancels a stalled upload before making any provider request', async () => {
  let cancelled = false; let calls = 0;
  const worker = createWorker(async () => { calls++; }, 10);
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const reply = await worker.fetch(request(input, { body, duplex: 'half' }), env());
  assert.equal(reply.status, 504); assert.equal(calls, 0); assert.equal(cancelled, true);
});
test('client abort and timeout cancel upstream; provider failures stay sanitized', async () => {
  for (const cancel of [true, false]) {
    const controller = new AbortController(); let started;
    const ready = new Promise(resolve => { started = resolve; }); let aborted = false;
    const worker = createWorker(async (url, { signal }) => {
      started(); return new Promise((resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); }));
    }, cancel ? 1000 : 10);
    const pending = worker.fetch(request(input, { signal: controller.signal }), env());
    await ready; if (cancel) controller.abort();
    const reply = await pending; assert.equal(reply.status, cancel ? 499 : 504); assert.equal(aborted, true);
  }
  let calls = 0;
  const worker = createWorker(async () => { calls++; return new Response('private key', { status: 401 }); });
  assert.deepEqual(await (await worker.fetch(request(), env())).json(), { error: 'invalid_provider_key' });
  assert.equal(calls, 1);
});

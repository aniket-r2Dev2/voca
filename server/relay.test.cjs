const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createRelay } = require('./relay.cjs');
const { validateInput } = require('./provider.cjs');
const token = 't'.repeat(48);
const input = { requestId: 'request-1', model: 'test-model', jobDescription: 'Build accessible interfaces.', evidence: [{ path: 'profile.summary', quote: 'Built accessible React interfaces.' }] };
const result = { requestId: input.requestId, proposed: 'Built accessible React interfaces.', reason: 'Relevant interface work.', evidence: input.evidence[0] };
const headers = { Authorization: `Bearer ${token}`, 'X-Provider-Key': 'test-provider-key', 'Content-Type': 'application/json' };
const response = (value = result) => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] });
async function fixture(t, options = {}) {
  let calls = [];
  const server = createRelay({ token, models: ['test-model'], fetchImpl: async (...args) => { calls.push(args); return response(); }, ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}/api/tailor`;
  const post = (body = input, extra = {}) => fetch(url, { method: 'POST', headers, body: JSON.stringify(body), ...extra });
  return { calls, post, url };
}
test('only approved fields go to fixed OpenAI endpoint; output stays review-compatible', async t => {
  const { calls, post } = await fixture(t);
  const reply = await post();
  assert.equal(reply.status, 200); assert.equal(reply.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await reply.json(), result);
  assert.equal(calls.length, 1);
  const [url, options] = calls[0]; const payload = JSON.parse(options.body);
  assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers.Authorization, 'Bearer test-provider-key');
  assert.equal(payload.store, false); assert.equal(payload.max_output_tokens, 2000);
  assert.equal(payload.text.format.strict, true);
  assert.deepEqual(JSON.parse(payload.input), { requestId: input.requestId, jobDescription: input.jobDescription, evidence: input.evidence });
  assert.ok(!options.body.includes(token));
});
test('authentication, CORS, host, methods, JSON and size gates block provider calls', async t => {
  const { calls, post, url } = await fixture(t);
  const cases = [
    [{ headers: { ...headers, Authorization: 'Bearer wrong' } }, 401],
    [{ headers: { ...headers, Origin: 'https://evil.example' } }, 403],
    [{ headers: { ...headers, 'Content-Type': 'text/plain' } }, 415],
    [{ headers: { ...headers, 'X-Provider-Key': '' } }, 400],
    [{ body: 'x'.repeat(50001) }, 413],
    [{ body: '{bad' }, 400]
  ];
  for (const [options, status] of cases) assert.equal((await post(input, options)).status, status);
  const hostStatus = await new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST', headers: { ...headers, Host: 'evil.example' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.end(JSON.stringify(input));
  });
  assert.equal(hostStatus, 403);
  assert.equal((await fetch(url)).status, 405);
  assert.equal((await fetch(url + '/other')).status, 404);
  const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000' } });
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  assert.equal(calls.length, 0);
});
test('input rejects extra contact fields, arbitrary endpoints/models and malformed evidence', () => {
  for (const value of [null, [], { ...input, contact: 'private' }, { ...input, endpoint: 'https://evil.example' }, { ...input, model: 'unknown' },
    { ...input, evidence: [] }, { ...input, evidence: [{ path: 'profile.email', quote: 'secret' }] },
    { ...input, evidence: [input.evidence[0], input.evidence[0]] }, { ...input, jobDescription: 'x'.repeat(20001) }]) {
    assert.throws(() => validateInput(value, ['test-model']), /invalid_request/);
  }
});
test('provider errors are sanitized and never retried', async t => {
  for (const [upstream, expected] of [[400, 422], [401, 401], [403, 403], [404, 422], [429, 429], [500, 502]]) {
    await t.test(String(upstream), async t => {
      let calls = 0;
      const { post } = await fixture(t, { fetchImpl: async () => { calls++; return new Response('private key and resume text', { status: upstream }); } });
      const reply = await post(); assert.equal(reply.status, expected);
      assert.ok(!(await reply.text()).includes('private')); assert.equal(calls, 1);
    });
  }
});
test('invalid, stale, invented evidence and oversized output cannot become proposals', async t => {
  const bodies = [
    () => response({ ...result, requestId: 'old' }),
    () => response({ ...result, decision: 'accepted' }),
    () => response({ ...result, evidence: { path: 'profile.summary', quote: 'Invented facts' } }),
    () => response({ ...result, proposed: 'x'.repeat(8001) }),
    () => new Response('invalid json'),
    () => new Response('x'.repeat(128001)),
    () => Response.json({ status: 'incomplete', output: [] }),
    () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] })
  ];
  for (const make of bodies) await t.test('rejects unsafe output', async t => {
    const { post } = await fixture(t, { fetchImpl: async () => make() });
    const reply = await post(); assert.ok([422, 502].includes(reply.status));
    assert.ok(!Object.hasOwn(await reply.json(), 'proposed'));
  });
});
test('network exceptions do not expose credentials or payloads', async t => {
  const { post } = await fixture(t, { fetchImpl: async () => { throw new Error('secret-key private resume'); } });
  assert.deepEqual(await (await post()).json(), { error: 'provider_connection_failed' });
});
test('timeout aborts upstream and frees the slot for explicit retry', async t => {
  let calls = 0; let aborted = false;
  const { post } = await fixture(t, { timeoutMs: 30, fetchImpl: async (url, { signal }) => {
    calls++;
    if (calls > 1) return response();
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); }, { once: true }));
  } });
  const reply = await post(); assert.equal(reply.status, 504); assert.equal(aborted, true);
  assert.equal((await post()).status, 200); assert.equal(calls, 2);
});
test('client disconnect cancels upstream; concurrent requests are blocked', async t => {
  let started; const ready = new Promise(resolve => { started = resolve; });
  let cancelled; const done = new Promise(resolve => { cancelled = resolve; });
  const { post } = await fixture(t, { fetchImpl: async (url, { signal }) => {
    started(); return new Promise((resolve, reject) => signal.addEventListener('abort', () => { cancelled(); reject(signal.reason); }, { once: true }));
  } });
  const controller = new AbortController();
  const pending = post(input, { signal: controller.signal }).catch(() => null);
  await ready;
  assert.equal((await post()).status, 429);
  controller.abort(); await pending; await done;
});
test('rate limit bounds sequential paid requests', async t => {
  const { post, calls } = await fixture(t, { maxRequests: 1 });
  assert.equal((await post()).status, 200); assert.equal((await post()).status, 429); assert.equal(calls.length, 1);
});
test('chunked oversized body is rejected before provider call', async t => {
  const { url, calls } = await fixture(t);
  const status = await new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'POST', headers }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.write('x'.repeat(30000)); req.end('x'.repeat(30000));
  });
  assert.equal(status, 413); assert.equal(calls.length, 0);
});
test('startup fails closed without token, models or local origin', () => {
  for (const options of [{ token: '' }, { models: [] }, { origin: 'https://public.example' }]) {
    assert.throws(() => createRelay({ token, models: ['test-model'], ...options }));
  }
});
test('capabilities requires local authentication and makes no provider request', async t => {
  const { url, calls } = await fixture(t);
  const endpoint = url.replace('/tailor', '/capabilities');
  assert.equal((await fetch(endpoint)).status, 401);
  const reply = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}`, Origin: 'http://localhost:3000' } });
  assert.equal(reply.status, 200);
  assert.deepEqual(await reply.json(), { provider: 'openai', models: ['test-model'] });
  assert.equal(reply.headers.get('cache-control'), 'no-store');
  assert.equal(calls.length, 0);
});

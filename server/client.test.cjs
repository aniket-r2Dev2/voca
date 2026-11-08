const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createRelay } = require('./relay.cjs');
function client(args, env, stdin = '') {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['server/client.cjs', ...args], { env: { ...process.env, ...env } });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => resolve({ code, stdout, stderr })); child.stdin.end(stdin);
  });
}
test('CLI requires explicit paid-request opt-in', async () => {
  const result = await client([], {});
  assert.equal(result.code, 1); assert.match(result.stderr, /--send/); assert.equal(result.stdout, '');
});
test('CLI sends prepared prompt through relay and emits import-compatible JSON', async t => {
  const token = 't'.repeat(48);
  const payload = { requestId: 'test-id', jobDescription: 'React role', evidence: [{ path: 'profile.summary', quote: 'Built React apps.' }] };
  const proposal = { requestId: payload.requestId, proposed: 'Built React apps.', reason: 'Relevant.', evidence: payload.evidence[0] };
  let calls = 0;
  const server = createRelay({ token, models: ['test-model'], fetchImpl: async () => {
    calls++; return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(proposal) }] }] });
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const env = { VOCA_MODEL: 'test-model', VOCA_RELAY_TOKEN: token, OPENAI_API_KEY: 'test-key-not-real', VOCA_PORT: String(server.address().port) };
  const result = await client(['--send'], env, 'Voca instructions\n\n' + JSON.stringify(payload));
  assert.equal(result.code, 0); assert.equal(result.stderr, ''); assert.deepEqual(JSON.parse(result.stdout), proposal); assert.equal(calls, 1);
  const invalid = await client(['--send'], env, JSON.stringify({ ...payload, contact: 'secret' }));
  assert.equal(invalid.code, 1); assert.equal(calls, 1); assert.ok(!invalid.stderr.includes('secret'));
});

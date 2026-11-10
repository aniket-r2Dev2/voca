// Starts workerd locally with synthetic credentials. No OpenAI request is made.
const { spawn } = require('node:child_process');
const https = require('node:https');
const assert = require('node:assert/strict');
const token = 'synthetic-test-token-00000000000000000000';
const runtimeEnv = { ...process.env, WRANGLER_SEND_METRICS: 'false' };
delete runtimeEnv.CLOUDFLARE_API_TOKEN; delete runtimeEnv.CLOUDFLARE_ACCOUNT_ID;
const child = spawn('npm', ['exec', '--yes', '--package=wrangler@4.160.0', '--', 'wrangler', 'dev', '--config', 'worker/wrangler.jsonc', '--local', '--local-protocol', 'https', '--ip', '127.0.0.1', '--port', '8792', '--var', 'VOCA_MODELS:test-model', '--var', `VOCA_RELAY_TOKEN:${token}`], { env: runtimeEnv, detached: true, stdio: 'ignore' });
function request(path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(`https://127.0.0.1:8792${path}`, { rejectUnauthorized: false, method: body ? 'POST' : 'GET', headers, timeout: 1000 }, res => {
      let text = ''; res.on('data', chunk => { text += chunk; }); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(text), headers: res.headers }));
    });
    req.on('error', reject); req.on('timeout', () => req.destroy(new Error('local timeout'))); req.end(body);
  });
}
(async () => {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error('Local Worker exited before readiness.');
    try { ready = (await request('/api/capabilities')).status === 401; } catch { /* startup */ }
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(ready, 'Local Worker did not become ready.');
  const headers = { Authorization: `Bearer ${token}`, Origin: 'https://aniket-r2dev2.github.io' };
  const reply = await request('/api/capabilities', headers);
  assert.equal(reply.status, 200); assert.deepEqual(reply.body, { provider: 'openai', models: ['test-model'] });
  assert.equal(reply.headers['access-control-allow-origin'], headers.Origin);
  assert.equal((await request('/api/capabilities', { ...headers, Origin: 'https://evil.example' })).status, 403);
  assert.equal((await request('/api/tailor', { ...headers, 'Content-Type': 'application/json', 'X-Provider-Key': 'synthetic-key' }, '{}')).status, 400);
  console.log('Worker runtime verified: authentication, capabilities, CORS and validation. No provider request made.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => {
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already stopped */ }
});

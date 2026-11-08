// Explicit opt-in local client; no credentials or document data are written to disk.
const { INPUT_BYTES, readBounded, validateInput } = require('./provider.cjs');
async function main() {
  if (!process.argv.includes('--send')) throw new Error('Preview the handoff prompt first. Add --send to authorize one potentially billable OpenAI request.');
  const model = process.env.VOCA_MODEL;
  const token = process.env.VOCA_RELAY_TOKEN;
  const key = process.env.OPENAI_API_KEY;
  const port = Number(process.env.VOCA_PORT || 8787);
  if (!model || !token || !key || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Set VOCA_MODEL, VOCA_RELAY_TOKEN, OPENAI_API_KEY and an optional valid VOCA_PORT.');
  const prompt = await readBounded(process.stdin, INPUT_BYTES, 400, 'Prompt exceeds 50,000 bytes.');
  let payload;
  try { payload = JSON.parse(prompt.slice(prompt.indexOf('{'))); } catch { throw new Error('Provide the complete prepared Voca handoff prompt on standard input.'); }
  const input = validateInput({ ...payload, model }, [model]);
  const body = JSON.stringify(input);
  if (Buffer.byteLength(body) > INPUT_BYTES) throw new Error('Select fewer passages; request exceeds 50,000 bytes.');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  process.once('SIGINT', cancel);
  const timer = setTimeout(cancel, 65000);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/tailor`, {
      method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'X-Provider-Key': key, 'Content-Type': 'application/json' }, body
    });
    const text = await readBounded(response.body, 128000, 502, 'Relay response too large.');
    if (!response.ok) {
      // Only relay error codes, never untrusted provider error bodies.
      let code; try { code = JSON.parse(text).error; } catch { /* generic error below */ }
      throw new Error(typeof code === 'string' && /^[a-z_]{1,60}$/.test(code) ? code : 'Relay request failed.');
    }
    process.stdout.write(text + '\n');
  } finally { clearTimeout(timer); process.off('SIGINT', cancel); }
}
main().catch(error => {
  // Fetch errors can include sensitive connection details; never print their causes.
  console.error(error.name === 'TypeError' || error.name === 'AbortError' ? 'Request failed or cancelled. No automatic retry was made.' : error.message);
  process.exitCode = 1;
});

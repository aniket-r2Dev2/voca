(async () => {
  const url = new URL(process.env.RELAY_URL);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.username || url.password || url.search || url.hash) throw new Error('Expected a Cloudflare workers.dev HTTPS deployment URL.');
  const endpoint = url.origin + '/api/capabilities';
  const token = process.env.VOCA_RELAY_TOKEN;
  const origin = 'https://aniket-r2dev2.github.io';
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}`, Origin: origin }, redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const body = await response.json();
      if (body.provider !== 'openai' || JSON.stringify(body.models) !== JSON.stringify(process.env.VOCA_MODELS.split(',')) || response.headers.get('access-control-allow-origin') !== origin) throw new Error('Unexpected capabilities or CORS configuration.');
      const unauthorized = await fetch(endpoint, { redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (unauthorized.status !== 401) throw new Error('Unauthenticated access was not rejected.');
      console.log('Verified authenticated capabilities, CORS and unauthorized rejection. No provider request made.'); return;
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error('Relay did not become ready.');
})().catch(() => { console.error('Cloudflare relay verification failed; check deployment configuration.'); process.exitCode = 1; });

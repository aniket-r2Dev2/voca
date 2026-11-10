const { spawnSync } = require('node:child_process');
const token = process.env.VOCA_RELAY_TOKEN || '';
if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) throw new Error('Configure a random VOCA_RELAY_TOKEN of 32–256 URL-safe characters.');
const result = spawnSync('npm', ['exec', '--yes', '--package=wrangler@4.160.0', '--', 'wrangler', 'secret', 'put', 'VOCA_RELAY_TOKEN', '--config', 'worker/deploy.json'], { input: token, stdio: ['pipe', 'inherit', 'inherit'], env: process.env });
process.exit(result.status ?? 1);

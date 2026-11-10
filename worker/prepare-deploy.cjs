const fs = require('node:fs');
const models = process.env.VOCA_MODELS || '';
if (!models || !models.split(',').every(model => /^[a-zA-Z0-9._-]{1,100}$/.test(model))) throw new Error('Configure VOCA_MODELS as comma-separated supported OpenAI model IDs.');
const config = JSON.parse(fs.readFileSync('worker/wrangler.jsonc', 'utf8'));
config.vars.VOCA_MODELS = models;
fs.writeFileSync('worker/deploy.json', JSON.stringify(config, null, 2));

export function relayEndpoint(configured = process.env.REACT_APP_VOCA_RELAY_URL, location = window.location) {
  const value = configured || (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://127.0.0.1:8787' : '');
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return '';
    const local = url.hostname === '127.0.0.1' && ['localhost', '127.0.0.1'].includes(location.hostname) && location.protocol === 'http:';
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return '';
    return url.origin;
  } catch { return ''; }
}
const messages = {
  unauthorized: 'Check your relay access token.', invalid_provider_key: 'The provider rejected your API key.',
  provider_access_denied: 'This API account does not have access.', model_unavailable: 'This model is unavailable to your API account.',
  provider_rate_or_quota_limit: 'The provider rate or quota limit was reached. Check your API account.',
  relay_busy_or_rate_limited: 'The relay is busy or rate limited. Try again later.',
  request_timeout: 'The request timed out. It may still incur provider charges.',
  provider_refusal: 'The provider declined this request.', invalid_provider_output: 'The response could not be validated.',
  incomplete_provider_output: 'The response was incomplete. Try fewer source passages.',
  provider_rejected_request: 'The provider rejected the request or model settings.',
  request_too_large: 'Select fewer passages or shorten the job description.'
};
export async function relayRequest(endpoint, route, { token, key, payload, signal }) {
  let response;
  try {
    response = await fetch(endpoint + route, {
      method: payload ? 'POST' : 'GET', signal, redirect: 'error', credentials: 'omit', cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json', 'X-Provider-Key': key } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {})
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Could not reach the relay. Check its address, access settings and network connection.');
  }
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 128000) throw new Error('The relay response exceeded the size limit.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0;
  chunks.forEach(chunk => { bytes.set(chunk, offset); offset += chunk.byteLength; });
  let result;
  try { result = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error('The relay returned an invalid response.'); }
  if (!response.ok) throw new Error(messages[result?.error] || 'The request failed. No automatic retry was made.');
  return result;
}
export function generationPayload(request, review, model) {
  if (!request || request.binding !== JSON.stringify(review)) throw new Error('This draft changed. Prepare a new prompt.');
  if (!model) throw new Error('Check the relay and select a model first.');
  if (review.job.description.length > 20000 || request.evidence.length > 20) throw new Error('Use a job description under 20,000 characters and at most 20 passages.');
  const payload = { requestId: request.requestId, model, jobDescription: review.job.description, evidence: request.evidence };
  if (new Blob([JSON.stringify(payload)]).size > 50000) throw new Error('Select fewer passages; the API request exceeds 50,000 bytes.');
  return payload;
}

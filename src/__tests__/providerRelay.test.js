import { relayEndpoint, generationPayload, relayRequest } from '../utils/providerRelay';
import { prepareHandoff } from '../utils/aiHandoff';
import { createEmptyCareerProfile } from '../utils/careerProfile';
const { TextDecoder, TextEncoder } = require('util');
beforeAll(() => { global.TextDecoder = TextDecoder; });
afterEach(() => { jest.restoreAllMocks(); delete global.fetch; });
test('destination is pinned by configuration; remote pages cannot use insecure local endpoints', () => {
  const remote = { hostname: 'example.com', protocol: 'https:' };
  expect(relayEndpoint('', remote)).toBe('');
  expect(relayEndpoint('http://127.0.0.1:8787', remote)).toBe('');
  for (const url of ['https://key@example.com', 'https://example.com/?key=x', 'https://example.com/#secret', 'http://example.com', 'https://example.com/api']) expect(relayEndpoint(url, remote)).toBe('');
  expect(relayEndpoint('https://relay.example.com', remote)).toBe('https://relay.example.com');
  expect(relayEndpoint('', { hostname: 'localhost', protocol: 'http:' })).toBe('http://127.0.0.1:8787');
});
test('payload omits contacts, binds to current review and enforces relay limits', () => {
  const source = createEmptyCareerProfile(); source.profile.summary = 'Built services.'; source.profile.email = 'secret@example.com';
  const review = { source, version: source, job: { description: 'Build services' } };
  const request = prepareHandoff(review, ['profile.summary'], 'id');
  expect(JSON.stringify(generationPayload(request, review, 'model'))).not.toContain('secret');
  expect(() => generationPayload(request, { ...review, revision: 2 }, 'model')).toThrow('changed');
  const long = { ...review, job: { description: 'x'.repeat(20001) } };
  expect(() => generationPayload(prepareHandoff(long, ['profile.summary'], 'id'), long, 'model')).toThrow('20,000');
});
function response(body, ok = true) {
  let read = false; const cancel = jest.fn();
  return { ok, body: { getReader: () => ({ cancel, read: async () => read ? { done: true } : (read = true, { value: new TextEncoder().encode(body), done: false }) }) } };
}
test('transport prevents redirects, omits cookies, sends key only for generation and sanitizes errors', async () => {
  global.fetch = jest.fn().mockResolvedValue(response('{"models":["test"]}'));
  const options = { token: 'relay-token', signal: new AbortController().signal };
  await relayRequest('https://relay.example', '/api/capabilities', options);
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', redirect: 'error', credentials: 'omit', cache: 'no-store', headers: { Authorization: 'Bearer relay-token' } });
  expect(fetch.mock.calls[0][1].headers['X-Provider-Key']).toBeUndefined();
  fetch.mockResolvedValue(response('{"error":"secret provider details"}', false));
  await expect(relayRequest('https://relay.example', '/api/tailor', { ...options, key: 'api-key', payload: { test: true } })).rejects.toThrow('No automatic retry');
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][1].headers['X-Provider-Key']).toBe('api-key');
});
test('oversized and malformed relay output is rejected', async () => {
  global.fetch = jest.fn().mockResolvedValue(response('x'.repeat(128001)));
  const options = { token: 'token', signal: new AbortController().signal };
  await expect(relayRequest('https://relay.example', '/api/capabilities', options)).rejects.toThrow('size limit');
  fetch.mockResolvedValue(response('broken'));
  await expect(relayRequest('https://relay.example', '/api/capabilities', options)).rejects.toThrow('invalid response');
});

import React, { useEffect, useRef, useState } from 'react';
import { importHandoff } from '../../utils/aiHandoff';
import { generationPayload, relayEndpoint, relayRequest } from '../../utils/providerRelay';
const field = 'block w-full rounded border p-2 dark:bg-slate-800';

export default function ApiGeneration({ request, review, onChange }) {
  const endpoint = relayEndpoint();
  const [token, setToken] = useState(''); const [key, setKey] = useState('');
  const [models, setModels] = useState([]); const [model, setModel] = useState('');
  const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const active = useRef(null); const latest = useRef(review); latest.current = review;
  const binding = JSON.stringify(review);
  useEffect(() => {
    setConsent(false); setKey(''); setToken(''); setModels([]); setModel(''); setBusy(false);
    return () => { active.current?.abort(); active.current = null; };
  }, [binding]);
  const fresh = request.binding === binding;
  let payload; let payloadError;
  try { payload = generationPayload(request, review, model); } catch (error) { payloadError = error.message; }

  async function run(generate) {
    const controller = new AbortController(); active.current = controller; setBusy(true); setMessage('');
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 65000);
    try {
      if (generate) {
        if (!consent || !key || !fresh) return;
        const result = await relayRequest(endpoint, '/api/tailor', { token, key, payload: generationPayload(request, latest.current, model), signal: controller.signal });
        if (controller.signal.aborted || active.current !== controller) return;
        onChange(importHandoff(JSON.stringify(result), request, latest.current));
        setKey(''); setConsent(false); setMessage('Suggestion ready below. Review its facts before accepting.');
      } else {
        const result = await relayRequest(endpoint, '/api/capabilities', { token, signal: controller.signal });
        if (controller.signal.aborted || active.current !== controller) return;
        if (result.provider !== 'openai' || !Array.isArray(result.models) || !result.models.length || !result.models.every(item => typeof item === 'string' && /^[a-zA-Z0-9._-]{1,100}$/.test(item))) throw new Error('The relay returned unsupported capabilities.');
        setModels(result.models); setModel(result.models[0]);
        setMessage('Relay connected. Your provider key and model access will be checked when you generate.');
      }
    } catch (error) {
      if (active.current === controller) setMessage(controller.signal.aborted ? (timedOut ? 'Request timed out. Provider charges may still apply.' : 'Cancelled. Provider charges may still apply.') : error.message);
    } finally {
      clearTimeout(timer);
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }
  if (!endpoint) return <p>Automatic API generation is not configured on this site yet. You can use the manual AI chat workflow above.</p>;
  return <section aria-label="Generate with an API key" className="space-y-3 border-t pt-3">
    <h4 className="font-semibold">Generate with your OpenAI API key</h4>
    <p>Relay: <span className="break-all">{endpoint}</span>. Provider: https://api.openai.com/v1/responses.</p>
    <p>Your relay receives the key, selected passages and job description and forwards them to OpenAI. Provider data policies and API billing apply. A chat subscription is not an API key.</p>
    <fieldset disabled={busy || !fresh} className="space-y-3">
      <legend className="sr-only">API connection</legend>
      <label className="block">Relay access token<input className={field} type="password" autoComplete="off" value={token} onChange={e => { setToken(e.target.value); setModels([]); setModel(''); setConsent(false); }} /></label>
      <button type="button" className="underline" disabled={!token} onClick={() => run(false)}>Check relay connection</button>
      <p>This check sends no resume data or provider key and makes no paid AI request.</p>
      {models.length > 0 && <>
        <label className="block">OpenAI model<select className={field} value={model} onChange={e => { setModel(e.target.value); setConsent(false); }}>{models.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="block">OpenAI API key<input className={field} type="password" autoComplete="off" value={key} onChange={e => { setKey(e.target.value); setConsent(false); }} /></label>
        <p>Keys stay in this page’s memory and are cleared when you leave or change drafts. Nothing is added to backups.</p>
        <p>Limits: 50,000 request bytes, 20,000 JD characters, 20 passages, 2,000 output tokens and a 60-second relay deadline. No automatic retries. Cancelling may not prevent charges.</p>
        {payload ? <label className="block">API payload to share<textarea className={field} rows={8} readOnly value={JSON.stringify(payload, null, 2)} /></label> : <p role="alert">{payloadError}</p>}
        <label className="block"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I reviewed this payload and authorize one potentially billable request through this relay to OpenAI.</label>
        <button type="button" className="underline" disabled={!consent || !key || !payload} onClick={() => run(true)}>Generate summary suggestion</button>
      </>}
      <button type="button" className="underline" onClick={() => { setKey(''); setToken(''); setModels([]); setModel(''); setConsent(false); setMessage('Credentials cleared.'); }}>Clear credentials</button>
    </fieldset>
    {busy && <button type="button" className="underline" onClick={() => active.current?.abort()}>Cancel API request</button>}
    {!fresh && <p>This draft changed. Prepare a new prompt before generating.</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}

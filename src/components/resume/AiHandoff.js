import React, { useState } from 'react';
import { availableEvidence, prepareHandoff, importHandoff, HANDOFF_LIMIT } from '../../utils/aiHandoff';

export default function AiHandoff({ review, onChange }) {
  const [selected, setSelected] = useState([]);
  const [request, setRequest] = useState(null);
  const [response, setResponse] = useState('');
  const [message, setMessage] = useState('');
  const evidence = availableEvidence(review);
  const fresh = request?.binding === JSON.stringify(review);

  function prepare() {
    try {
      setRequest(prepareHandoff(review, selected, crypto.randomUUID()));
      setResponse('');
      setMessage('');
    } catch (error) { setMessage(error.message); }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(request.prompt);
      setMessage('Prompt copied. Paste it into your chosen AI chat.');
    } catch {
      setMessage('Select and copy the prompt text below.');
    }
  }

  function receive() {
    try {
      const next = importHandoff(response, request, review);
      onChange(next);
      setRequest(null);
      setResponse('');
      setMessage('Suggestion ready below. Check its facts before accepting.');
    } catch (error) { setMessage(error.message); }
  }

  return <section className="space-y-3 rounded border border-gray-400 p-4">
    <h3 className="font-semibold">Use your AI chat</h3>
    <p>Select passages and review the prompt, then copy it into your chosen chat service. Your chat service’s data policies and usage limits apply when you paste it there.</p>
    <p>Check for personal details inside the passages and job description before copying. This workflow proposes a summary change.</p>
    <fieldset className="space-y-2">
      <legend>Choose source passages to share</legend>
      {evidence.map((item, index) => <label className="block" key={item.path}>
        <input type="checkbox" checked={selected.includes(item.path)} onChange={event => {
          setSelected(event.target.checked ? [...selected, item.path] : selected.filter(path => path !== item.path));
          setRequest(null);
          setResponse('');
        }} /> {item.path === 'profile.summary' ? 'Original summary' : 'Experience passage ' + (index + 1)}
        <span className="block whitespace-pre-wrap text-sm">{item.quote}</span>
      </label>)}
    </fieldset>
    <button className="underline" onClick={prepare}>Prepare AI prompt</button>
    {request && <>
      <label className="block">Prompt to share<textarea className="block w-full rounded border p-2 dark:bg-slate-800" rows={10} readOnly value={request.prompt} /></label>
      {!fresh && <p>This draft changed. Prepare a new prompt.</p>}
      <button className="underline" disabled={!fresh} onClick={copy}>Copy reviewed prompt</button>
      <label className="block">AI JSON response<textarea className="block w-full rounded border p-2 dark:bg-slate-800" rows={6} maxLength={HANDOFF_LIMIT} value={response} onChange={event => setResponse(event.target.value)} /></label>
      <button className="underline" disabled={!fresh} onClick={receive}>Review AI response</button>
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}

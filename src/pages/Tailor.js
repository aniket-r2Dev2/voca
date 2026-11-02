import React, { useState } from 'react';
import useCareerStore from '../hooks/useCareerStore';
import { parseResumeText, readResumeFile, RESUME_IMPORT_MAX_BYTES } from '../utils/resumeImport';
import { createResumeTextPdf, resumeTextBlocks } from '../utils/resumeTextPdf';

const field = 'mt-1 block w-full rounded border border-gray-400 bg-white p-2 dark:bg-slate-800';
const button = 'rounded bg-linkedin-700 px-4 py-2 font-medium text-white disabled:opacity-50';
const jdLimit = 30000;

export default function Tailor() {
  const { careerProfile } = useCareerStore();
  const [mode, setMode] = useState('profile');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState({ description: '', company: '', role: '' });
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');

  async function importFile(file) {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const result = await readResumeFile(file);
      setText(result.source);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function prepare(event) {
    event.preventDefault();
    setError('');
    try {
      let source = careerProfile;
      if (mode === 'text') {
        if (new Blob([text]).size > RESUME_IMPORT_MAX_BYTES) throw new Error('Use up to 1 MiB of resume text.');
        const { draft, remaining } = parseResumeText(text);
        source = { ...draft, profile: { ...draft.profile, summary: [draft.profile.summary, remaining].filter(Boolean).join('\n\n') } };
      }
      if (!source || !resumeTextBlocks(source).length) throw new Error('Your profile is empty. Paste a resume or choose a TXT file.');
      if (!job.description.trim() || job.description.length > jdLimit) throw new Error('Enter a job description of up to 30,000 characters.');
      setReview({ source, version: source, job: { ...job } });
    } catch (err) {
      setError(err.message);
    }
  }

  function download() {
    setError('');
    try {
      createResumeTextPdf(review.version).save('Voca-resume.pdf');
    } catch (err) {
      setError(err.message);
    }
  }

  return <main className="mx-auto max-w-3xl space-y-5 p-5 text-gray-900 dark:text-gray-100">
    <h1 className="text-3xl font-bold">Tailor my resume</h1>
    <p>Prepare a resume for one job. This draft stays on this page until you leave or reload it.</p>
    {error && <p role="alert" className="rounded border border-red-400 p-3">{error}</p>}
    {!review ? <form onSubmit={prepare} className="space-y-5">
      <fieldset disabled={loading} className="space-y-3">
        <legend className="text-lg font-semibold">Source resume</legend>
        <label className="block"><input type="radio" checked={mode === 'profile'} onChange={() => setMode('profile')} /> Use my Voca profile</label>
        <label className="block"><input type="radio" checked={mode === 'text'} onChange={() => setMode('text')} /> Paste text or open a TXT file</label>
        {mode === 'text' && <>
          <label className="block">Open UTF-8 TXT (up to 1 MiB)<input className={field} type="file" accept=".txt,text/plain" onChange={e => { const file = e.target.files[0]; e.target.value = ''; importFile(file); }} /></label>
          <label className="block">Resume text<textarea className={field} rows={8} value={text} onChange={e => setText(e.target.value)} /></label>
        </>}
      </fieldset>
      <label className="block">Job description<textarea className={field} rows={6} value={job.description} onChange={e => setJob({ ...job, description: e.target.value })} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        {['company', 'role'].map(key => <label key={key} className="capitalize">{key} (optional)<input className={field} maxLength={180} value={job[key]} onChange={e => setJob({ ...job, [key]: e.target.value })} /></label>)}
      </div>
      <button className={button} disabled={loading}>Review draft</button>
    </form> : <section className="space-y-4">
      <h2 className="text-xl font-semibold">{[review.job.role, review.job.company].filter(Boolean).join(' at ') || 'Job-specific draft'}</h2>
      <details><summary>Job description</summary><p className="whitespace-pre-wrap">{review.job.description}</p></details>
      <label className="block">Edit draft summary<textarea className={field} rows={5} value={review.version.profile.summary || ''} onChange={e => setReview({ ...review, version: { ...review.version, profile: { ...review.version.profile, summary: e.target.value } } })} /></label>
      <details open><summary>Resume preview</summary>
        {resumeTextBlocks(review.version).map((block, i) => <p className="whitespace-pre-wrap py-1" key={i}>{block.text}</p>)}
      </details>
      <div className="flex flex-wrap gap-3">
        <button className={button} onClick={download}>Download draft PDF</button>
        <button className="underline" onClick={() => { setReview(null); setError(''); }}>Discard draft and edit inputs</button>
      </div>
    </section>}
  </main>;
}

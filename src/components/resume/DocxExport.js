import React, { useState } from 'react';
import Button from '../common/Button';
import { downloadResumeDocx } from '../../utils/resumeDocx';

export default function DocxExport({ career, draft = false }) {
  const [paperSize, setPaperSize] = useState('a4');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download() {
    setBusy(true);
    setError('');
    try { await downloadResumeDocx(career, { paperSize }); }
    catch (err) { setError(err.message || 'Could not export DOCX. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section aria-label="Editable DOCX export" className="rounded-xl border border-gray-200 bg-white p-5 mb-8 dark:border-gray-700 dark:bg-slate-800 text-gray-800 dark:text-gray-100">
    <h2 className="text-lg font-semibold">Download an editable Word document</h2>
    <p className="my-2 text-sm">A clean single-column layout you can edit in Word or Google Docs, generated on this device. Fonts and page breaks may vary by editor. {draft ? 'Includes your current draft wording; pending suggestions are excluded.' : 'Includes your career profile in a standard layout, independent of the selected visual template.'}</p>
    <div className="flex flex-wrap items-end gap-4">
      <label className="block text-sm font-medium">DOCX paper size<select disabled={busy} value={paperSize} onChange={event => setPaperSize(event.target.value)} className="mt-1 block rounded border border-gray-300 bg-white p-2 text-gray-900 dark:bg-slate-900 dark:text-gray-100"><option value="a4">A4</option><option value="letter">Letter</option></select></label>
      <Button disabled={busy} onClick={download}>{busy ? 'Generating DOCX...' : draft ? 'Download draft DOCX' : 'Download DOCX'}</Button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
  </section>;
}

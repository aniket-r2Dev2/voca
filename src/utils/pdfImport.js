import pdfPackage from 'pdfjs-dist/package.json';
import { RESUME_IMPORT_MAX_BYTES } from './resumeImport';

const base = process.env.PUBLIC_URL + '/pdf-reader/' + pdfPackage.version + '/';
const maxPages = 30;

async function readPages(doc) {
  if (doc.numPages > maxPages) throw new Error('Choose a PDF with 30 pages or fewer.');
  const pages = [];
  const emptyPages = [];
  let bytes = 0;
  for (let number = 1; number <= doc.numPages; number++) {
    const page = await doc.getPage(number);
    const reader = page.streamTextContent().getReader();
    const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = value.items.map(item => typeof item.str === 'string'
          ? item.str + (item.hasEOL ? '\n' : '') : '').join('');
        bytes += new Blob([chunk]).size;
        if (bytes > RESUME_IMPORT_MAX_BYTES) throw new Error('PDF text exceeds 1 MiB. Paste a shorter resume.');
        if (chunk) chunks.push(chunk);
      }
    } finally {
      reader.releaseLock();
      page.cleanup();
    }
    const text = chunks.join('').trim();
    if (text) pages.push(text);
    else emptyPages.push(number);
    bytes += 2;
  }
  if (!pages.length) throw new Error('No selectable text was found. For a scanned PDF, run OCR first or paste your resume text.');
  return { source: pages.join('\n\n'), notice: 'Review the extracted text, especially the order of columns and tables.'
    + (emptyPages.length ? ' Pages without selectable text: ' + emptyPages.join(', ') + '. Add any missing details.' : '') };
}

export async function readPdfFile(file, signal) {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('Choose a non-empty PDF up to 5 MiB.');
  signal.throwIfAborted();
  let port, pdfWorker, task, cancel, timer;
  let stopped = false;
  const stoppedPromise = new Promise((_, reject) => {
    cancel = () => reject(new DOMException('Import cancelled.', 'AbortError'));
    signal.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => reject(new Error('PDF import timed out. Try a shorter PDF or paste your resume text.')), 15000);
  });
  async function extract() {
    const [pdf, data] = await Promise.all([import(/* webpackIgnore: true */ base + 'pdf.js'), file.arrayBuffer()]);
    if (stopped) throw new Error('Import stopped.');
    port = new Worker(base + 'pdf.worker.js', { type: 'module' });
    pdfWorker = pdf.PDFWorker.create({ port });
    task = pdf.getDocument({ data, worker: pdfWorker, stopAtErrors: true, isEvalSupported: false,
      useWasm: false, disableFontFace: true, useSystemFonts: false, cMapPacked: true,
      cMapUrl: new URL(base + 'cmaps/', document.baseURI).href,
      standardFontDataUrl: new URL(base + 'standard_fonts/', document.baseURI).href });
    let doc;
    try {
      doc = await task.promise;
    } catch (error) {
      if (error.name === 'PasswordException') throw new Error('This PDF needs a password. Choose an unlocked copy or paste your resume.');
      throw new Error('Could not open this PDF. Save a fresh copy or paste your resume.');
    }
    return readPages(doc);
  }
  try {
    return await Promise.race([stoppedPromise, extract()]);
  } finally {
    stopped = true;
    signal.removeEventListener('abort', cancel);
    clearTimeout(timer);
    task?.destroy().catch(() => {});
    pdfWorker?.destroy();
    port?.terminate();
  }
}

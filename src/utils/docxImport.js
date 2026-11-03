import { extractDocxBody } from './docxBody';

export async function readDocxFile(file, signal) {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('Choose a non-empty DOCX file up to 5 MiB.');
  signal.throwIfAborted();
  const worker = new Worker(new URL('./docxArchive.worker.js', import.meta.url));
  let timer;
  let cancel;
  try {
    const parts = await new Promise((resolve, reject) => {
      cancel = () => reject(new DOMException('Import cancelled.', 'AbortError'));
      signal.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => reject(new Error('The import timed out. Paste the resume text instead.')), 10000);
      worker.onerror = () => reject(new Error('Could not start the DOCX reader. Paste your resume text instead.'));
      worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data);
      worker.postMessage(file);
    });
    return extractDocxBody(parts.types, parts.body);
  } finally {
    worker.terminate();
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}

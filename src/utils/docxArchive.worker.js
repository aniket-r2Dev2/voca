/* eslint-env worker */
/* global globalThis */
import { BlobReader, ZipReader } from '@zip.js/zip.js/index-native.js';

const MIB = 1024 * 1024;
const parts = new Map([['[Content_Types].xml', 128 * 1024], ['word/document.xml', 2 * MIB]]);

async function readPart(entry, limit) {
  const chunks = [];
  let size = 0;
  const sink = new WritableStream({
    write(chunk) {
      size += chunk.length;
      if (size > limit) throw new Error('Expanded Word text exceeds the import limit.');
      chunks.push(chunk);
    }
  });
  await entry.getData(sink, { checkSignature: true });
  return new TextDecoder('utf-8', { fatal: true }).decode(await new Blob(chunks).arrayBuffer());
}

async function readArchive(file) {
  const reader = new ZipReader(new BlobReader(file), { useWebWorkers: false, strictness: 'strict' });
  const found = new Map();
  let count = 0;
  let total = 0;
  try {
    for await (const entry of reader.getEntriesGenerator()) {
      count += 1;
      total += entry.uncompressedSize;
      if (count > 512 || total > 32 * MIB) throw new Error('This Word document exceeds the import limits.');
      if (entry.encrypted) throw new Error('Open the document in Word and save a copy without a password.');
      const limit = parts.get(entry.filename);
      if (!limit) continue;
      if (entry.uncompressedSize > limit) throw new Error('Expanded Word text exceeds the import limit.');
      found.set(entry.filename, entry);
    }
    if (found.size !== parts.size) throw new Error('Choose a standard DOCX file.');
    const types = await readPart(found.get('[Content_Types].xml'), parts.get('[Content_Types].xml'));
    const body = await readPart(found.get('word/document.xml'), parts.get('word/document.xml'));
    return { types, body };
  } finally {
    await reader.close();
  }
}

globalThis.onmessage = async ({ data: file }) => {
  try {
    globalThis.postMessage(await readArchive(file));
  } catch (error) {
    globalThis.postMessage({ error: 'Could not read this DOCX. Save a new, unprotected Word copy or paste your text. ' + error.message });
  }
};

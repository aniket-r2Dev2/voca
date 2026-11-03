const WORD_NAMESPACES = [
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  'http://purl.oclc.org/ooxml/wordprocessingml/main'
];
const TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types';

function readXml(xml) {
  if (/<!DOCTYPE/i.test(xml) || xml.split('<', 50001).length > 50000) {
    throw new Error('This document is too complex. Paste the resume text instead.');
  }
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('Invalid Word XML. Save a new DOCX copy or paste the text.');
  return document;
}

export function extractDocxBody(typesXml, bodyXml) {
  const types = readXml(typesXml);
  const supported = Array.from(types.getElementsByTagNameNS(TYPES, 'Override')).some(entry =>
    entry.getAttribute('PartName') === '/word/document.xml' &&
    entry.getAttribute('ContentType') === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml');
  if (!supported) throw new Error('Choose a standard .docx Word document or paste your resume.');

  const document = readXml(bodyXml);
  const root = document.documentElement;
  const ns = root.namespaceURI;
  const body = Array.from(root.children).find(node => node.namespaceURI === ns && node.localName === 'body');
  if (!WORD_NAMESPACES.includes(ns) || root.localName !== 'document' || !body) throw new Error('The file has no readable Word document body.');

  const pieces = [];
  // Skip deleted revisions and alternate renderings of drawings rather than
  // mixing obsolete or duplicate text into the reviewed resume.
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      if ((node.namespaceURI === ns && ['del', 'moveFrom', 'drawing', 'pict'].includes(node.localName))
          || node.localName === 'AlternateContent') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let node;
  while ((node = walker.nextNode())) {
    if (node.namespaceURI !== ns) continue;
    switch (node.localName) {
      case 'p': case 'br': case 'cr': pieces.push('\n'); break;
      case 'tab': pieces.push('\t'); break;
      case 't':
        if (node.childElementCount) throw new Error('Invalid Word text. Save a new DOCX copy or paste the text.');
        pieces.push(node.textContent);
        break;
      default: break;
    }
  }
  const source = pieces.join('').trim();
  if (!source) throw new Error('No editable body text was found. Paste the resume text from another copy.');
  if (new Blob([source]).size > 1024 * 1024) throw new Error('The resume text exceeds 1 MiB. Paste a shorter version.');
  return source;
}

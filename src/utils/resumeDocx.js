import { resumeTextBlocks } from './resumeTextPdf';

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const escapeXml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const styles = { title: ['Title', 44, true], subtitle: ['Subtitle', 26, false], section: ['Heading1', 26, true], entry: ['Heading2', 23, true], detail: ['Detail', 20, false], body: ['Normal', 22, false] };

/** Only resume text enters the package: never draft history, prompts or job descriptions. */
export function resumeDocxParts(career, { paperSize = 'a4' } = {}) {
  if (!['a4', 'letter'].includes(paperSize)) throw new Error('Choose A4 or Letter paper.');
  const blocks = resumeTextBlocks(career);
  if (!blocks.length) throw new Error('Add career details before downloading a DOCX.');
  if (blocks.reduce((sum, block) => sum + block.text.length, 0) > 200000) throw new Error('This resume is too long for DOCX export. Shorten it to under 200,000 characters.');
  // XML 1.0 cannot represent these characters; fail without silently dropping text.
  if (blocks.some(block => /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(block.text))) throw new Error('This resume contains invalid text characters. Remove them before downloading a DOCX.');
  const paragraphs = blocks.map(block => block.text.replace(/\r\n?/g, '\n').split('\n').map(line => {
    const content = line.split('\t').map(part => `<w:t xml:space="preserve">${escapeXml(part)}</w:t>`).join('<w:tab/>');
    return `<w:p><w:pPr><w:pStyle w:val="${styles[block.style][0]}"/></w:pPr><w:r>${content}</w:r></w:p>`;
  }).join('')).join('');
  const [width, height] = paperSize === 'letter' ? [12240, 15840] : [11906, 16838];
  const document = `${declaration}<w:document xmlns:w="${ns}"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="${width}" w:h="${height}"/><w:pgMar w:top="1020" w:right="1020" w:bottom="1020" w:left="1020" w:header="480" w:footer="480" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styleXml = `${declaration}<w:styles xmlns:w="${ns}">${Object.entries(styles).map(([key, [id, size, bold]]) => {
    const heading = key === 'section' || key === 'entry';
    return `<w:style w:type="paragraph"${key === 'body' ? ' w:default="1"' : ''} w:styleId="${id}"><w:name w:val="${id}"/>${key === 'body' ? '' : '<w:basedOn w:val="Normal"/>'}<w:pPr>${heading ? '<w:keepNext/>' : ''}<w:widowControl/><w:spacing w:before="${heading ? 180 : 0}" w:after="100" w:line="276" w:lineRule="auto"/>${heading ? `<w:outlineLvl w:val="${key === 'section' ? 0 : 1}"/>` : ''}</w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${bold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`;
  }).join('')}</w:styles>`;
  return {
    '[Content_Types].xml': `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    '_rels/.rels': `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/document.xml': document,
    'word/styles.xml': styleXml,
    'word/_rels/document.xml.rels': `${declaration}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  };
}

export async function createResumeDocx(career, options) {
  const parts = resumeDocxParts(career, options);
  const { ZipWriter, BlobWriter, TextReader } = await import('@zip.js/zip.js/index-native.js');
  const writer = new ZipWriter(new BlobWriter(DOCX_MIME), { useWebWorkers: false, level: 0 });
  for (const [path, content] of Object.entries(parts)) await writer.add(path, new TextReader(content));
  return writer.close();
}

export async function downloadResumeDocx(career, options) {
  const blob = await createResumeDocx(career, options);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = `Voca-resume-${options?.paperSize || 'a4'}.docx`;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Allow the browser to consume the object URL before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

import { extractDocxBody } from '../utils/docxBody';

const types = '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const body = inner => '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + inner + '</w:body></w:document>';

test('joins runs, preserves paragraph/table order, and excludes deleted text', () => {
  const xml = body('<w:p><w:r><w:t>Alex </w:t></w:r><w:r><w:t>Smith</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>IAM</w:t><w:tab/><w:t>Engineer</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:del><w:r><w:t>Old text</w:t></w:r></w:del>');
  expect(extractDocxBody(types, xml)).toBe('Alex Smith\nIAM\tEngineer');
});
test('rejects active DTDs, unsupported package types, corrupt XML and image-only bodies', () => {
  expect(() => extractDocxBody(types, '<!DOCTYPE w:document>' + body(''))).toThrow('complex');
  expect(() => extractDocxBody('<Types/>', body(''))).toThrow('standard');
  expect(() => extractDocxBody(types, '<invalid')).toThrow('Invalid Word XML');
  expect(() => extractDocxBody(types, body('<w:p><w:drawing/></w:p>'))).toThrow('No editable body text');
});

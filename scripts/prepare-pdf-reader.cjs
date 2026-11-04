// Serve matching ES modules from this installation, including on Pages subpaths.
const fs = require('node:fs');
const path = require('node:path');
const pkg = require('pdfjs-dist/package.json');
const root = path.dirname(require.resolve('pdfjs-dist/package.json'));
const dest = path.resolve(__dirname, '../public/pdf-reader', pkg.version);
fs.mkdirSync(dest, { recursive: true });
for (const name of ['pdf', 'pdf.worker']) {
  fs.copyFileSync(path.join(root, 'legacy/build', name + '.min.mjs'), path.join(dest, name + '.js'));
}
for (const name of ['cmaps', 'standard_fonts', 'LICENSE']) {
  fs.cpSync(path.join(root, name), path.join(dest, name), { recursive: true });
}

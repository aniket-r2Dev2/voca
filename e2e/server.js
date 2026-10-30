const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4173);
const HOST = '127.0.0.1';
const BASE_PATH = '/voca';
const BUILD_DIR = path.resolve(__dirname, '..', 'build');
const INDEX_FILE = path.join(BUILD_DIR, 'index.html');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function sendFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[extension] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === BASE_PATH || pathname === `${BASE_PATH}/`) {
    return sendFile(res, INDEX_FILE);
  }

  if (pathname.startsWith(`${BASE_PATH}/`)) {
    pathname = pathname.slice(BASE_PATH.length);
  }

  const requestedFile = path.resolve(BUILD_DIR, `.${pathname}`);
  const isInsideBuild = requestedFile === BUILD_DIR || requestedFile.startsWith(`${BUILD_DIR}${path.sep}`);

  if (isInsideBuild && fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
    return sendFile(res, requestedFile);
  }

  // React Router routes must resolve to the SPA entry point. This mirrors
  // GitHub Pages' SPA fallback while keeping /voca as the basename.
  return sendFile(res, INDEX_FILE);
});

server.listen(PORT, HOST, () => {
  console.log(`Serving build at http://${HOST}:${PORT}${BASE_PATH}/`);
});

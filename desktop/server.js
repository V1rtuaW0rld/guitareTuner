const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4492;
const PUBLIC_DIR = path.join(__dirname, 'webapp');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm'
};

function startServer(callback) {
  const server = http.createServer((req, res) => {
    // Basic CORS & Security headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    let filePath = path.join(PUBLIC_DIR, decodeURIComponent(reqUrl));

    // Security check to prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} is already in use. Assuming server is already running.`);
      if (callback) callback(null, server);
    } else {
      console.error('Server error:', err);
      if (callback) callback(err);
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Accordeur HTTP Server running at http://0.0.0.0:${PORT}/`);
    if (callback) callback(null, server);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer, PORT };

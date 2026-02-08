/**
 * LobsterBoard Dashboard Server
 * 
 * A minimal server that:
 * - Serves your dashboard static files
 * - Proxies allowed OpenClaw API endpoints
 * 
 * Usage: node server.js
 * 
 * Environment variables:
 *   PORT          - Server port (default: 8080)
 *   HOST          - Bind address (default: 127.0.0.1 for security)
 *   OPENCLAW_URL  - OpenClaw gateway URL (default: http://localhost:18789)
 * 
 * Security: By default binds to localhost only. To expose on network:
 *   HOST=0.0.0.0 node server.js
 *   ⚠️  Only do this on trusted networks!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '127.0.0.1';
const OPENCLAW_URL = (process.env.OPENCLAW_URL || 'http://localhost:18789').replace(/\/$/, '');

// Allowed API endpoints (whitelist for security)
const ALLOWED_API_PATHS = [
  '/api/status',
  '/api/health',
  '/api/activity',
  '/api/cron',
  '/api/logs',
  '/api/sessions',
  '/api/usage/tokens'
];

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Proxy request to OpenClaw
async function proxyToOpenClaw(reqPath, res) {
  const url = OPENCLAW_URL + reqPath;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.text();
    
    res.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  } catch (error) {
    clearTimeout(timeout);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to reach OpenClaw', details: error.message }));
  }
}

// Serve static file
function serveStatic(filePath, res) {
  // Default to index.html
  if (filePath === '/') filePath = '/index.html';
  
  const fullPath = path.resolve(__dirname, '.' + filePath);
  
  // Prevent path traversal attacks
  if (!fullPath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  
  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
      return;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Create server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }
  
  // Check if this is an allowed API proxy request
  if (pathname.startsWith('/api/')) {
    if (ALLOWED_API_PATHS.includes(pathname)) {
      await proxyToOpenClaw(pathname, res);
    } else {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API endpoint not allowed' }));
    }
    return;
  }
  
  // Serve static files
  serveStatic(pathname, res);
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`
🦞 LobsterBoard Dashboard Server

   Local:   http://${HOST}:${PORT}
   OpenClaw: ${OPENCLAW_URL}
   
   Proxied endpoints: ${ALLOWED_API_PATHS.join(', ')}
   
${HOST === '127.0.0.1' ? '   ✓ Bound to localhost (secure)\n' : '   ⚠️  Exposed to network - use on trusted networks only!\n'}
   Press Ctrl+C to stop
`);
});

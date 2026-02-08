/**
 * LobsterBoard OpenClaw API Server
 * 
 * Provides REST API endpoints for OpenClaw widgets by querying
 * the OpenClaw CLI and formatting responses as JSON.
 * 
 * Usage: node openclaw-api-server.js
 * 
 * Endpoints:
 *   GET /api/status   - Auth mode, version, session info
 *   GET /api/cron     - List of cron jobs
 *   GET /api/activity - Recent session activity (placeholder)
 *   GET /api/logs     - Recent log lines (placeholder)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '127.0.0.1';

// MIME types
const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

// Cache for expensive operations (refresh every 30s)
let statusCache = { data: null, timestamp: 0 };
let cronCache = { data: null, timestamp: 0 };
const CACHE_TTL = 30000; // 30 seconds

// Run openclaw CLI command and return output
function runOpenClawCmd(args) {
  try {
    const result = execSync(`openclaw ${args}`, { 
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result;
  } catch (e) {
    console.error(`openclaw ${args} failed:`, e.message);
    return null;
  }
}

// Parse openclaw status output
function parseStatus() {
  const now = Date.now();
  if (statusCache.data && (now - statusCache.timestamp) < CACHE_TTL) {
    return statusCache.data;
  }

  const output = runOpenClawCmd('status');
  if (!output) {
    return { error: 'Failed to get status' };
  }

  // Get current running version
  const versionOutput = runOpenClawCmd('--version');
  const currentVersion = versionOutput ? versionOutput.trim() : 'unknown';

  // Parse the status table
  const data = {
    authMode: 'unknown',
    version: currentVersion,
    sessions: 0,
    gateway: 'unknown'
  };

  // Look for auth info - check for oauth/claude-cli pattern
  // Note: "auth token" in Gateway line refers to gateway auth, not Anthropic
  if (output.includes('oauth') || output.includes('claude-cli')) {
    data.authMode = 'oauth';
  } else if (output.includes('api-key') || output.match(/sk-ant-/)) {
    data.authMode = 'api-key';
  } else {
    // Default to oauth if we can't determine (better than guessing api-key)
    data.authMode = 'oauth';
  }

  // Look for version
  const versionMatch = output.match(/npm update ([\d.-]+)/);
  if (versionMatch) {
    data.latestVersion = versionMatch[1];
  }

  // Look for current version in Update line
  const updateLine = output.match(/Update\s*│\s*([^│]+)/);
  if (updateLine) {
    data.updateInfo = updateLine[1].trim();
  }

  // Look for sessions count
  const sessionsMatch = output.match(/sessions?\s+(\d+)/i);
  if (sessionsMatch) {
    data.sessions = parseInt(sessionsMatch[1]);
  }

  // Look for gateway status
  if (output.includes('running')) {
    data.gateway = 'running';
  }

  statusCache = { data, timestamp: now };
  return data;
}

// Parse cron jobs
function parseCronJobs() {
  const now = Date.now();
  if (cronCache.data && (now - cronCache.timestamp) < CACHE_TTL) {
    return cronCache.data;
  }

  // Get cron jobs via CLI (correct command: openclaw cron list --json)
  const output = runOpenClawCmd('cron list --json');
  
  let jobs = [];
  try {
    if (output) {
      const parsed = JSON.parse(output);
      // The CLI returns { jobs: [...] }
      jobs = parsed.jobs || [];
    }
  } catch (e) {
    console.error('Failed to parse cron jobs:', e.message);
  }

  const data = { jobs };
  cronCache = { data, timestamp: now };
  return data;
}

// API handlers
const API_HANDLERS = {
  '/api/status': (req, res) => {
    const data = parseStatus();
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
  },

  '/api/cron': (req, res) => {
    const data = parseCronJobs();
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
  },

  '/api/activity': (req, res) => {
    // Placeholder - would need to query session history
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      items: [
        { text: 'Activity feed coming soon', time: new Date().toISOString() }
      ]
    }));
  },

  '/api/logs': (req, res) => {
    // Try to read recent logs
    let lines = ['Log viewer coming soon'];
    
    // Try common log locations
    const logPaths = [
      path.join(process.env.HOME, '.config/openclaw/logs/gateway.log'),
      path.join(process.env.HOME, 'Library/Logs/openclaw/gateway.log'),
      '/var/log/openclaw/gateway.log'
    ];

    for (const logPath of logPaths) {
      try {
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf8');
          lines = content.split('\n').slice(-100).filter(l => l.trim());
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }

    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ lines }));
  },

  '/api/sessions': (req, res) => {
    const status = parseStatus();
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ count: status.sessions || 0 }));
  }
};

// Serve static files
function serveStatic(filePath, res) {
  if (filePath === '/') filePath = '/index.html';
  const fullPath = path.resolve(__dirname, '.' + filePath);
  
  // Prevent path traversal attacks
  if (!fullPath.startsWith(path.resolve(__dirname))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  const ext = path.extname(fullPath).toLowerCase();
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not Found' : 'Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// Create server
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://' + req.headers.host).pathname;
  
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }
  
  // API endpoints
  if (API_HANDLERS[pathname]) {
    API_HANDLERS[pathname](req, res);
    return;
  }
  
  // Static files
  serveStatic(pathname, res);
});

server.listen(PORT, HOST, () => {
  console.log(`
🦞 LobsterBoard OpenClaw API Server

   Dashboard: http://${HOST}:${PORT}
   
   API Endpoints:
   • /api/status   - Auth mode & version
   • /api/cron     - Cron jobs list
   • /api/activity - Activity feed
   • /api/logs     - System logs
   • /api/sessions - Session count
   
${HOST === '127.0.0.1' ? '   ✓ Bound to localhost (secure)\n' : '   ⚠️  Exposed to network\n'}
   Press Ctrl+C to stop
`);
});

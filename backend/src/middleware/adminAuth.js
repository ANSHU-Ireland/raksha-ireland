const logger = require('../utils/logger');

// Parse Basic auth header manually to avoid extra dependency
function parseBasic(req) {
  const header = req.headers['authorization'] || '';
  const match = header.match(/^Basic\s+(.*)$/i);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx === -1) return null;
    return { name: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

// Simple Basic Auth for admin panel (set env ADMIN_USER and ADMIN_PASS)
module.exports = function adminAuth(req, res, next) {
  const creds = parseBasic(req);
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;

  if (!user || !pass) {
    logger.warn('Admin credentials not set (ADMIN_USER/ADMIN_PASS)');
    return res.status(503).send('Admin credentials not configured');
  }

  if (!creds || creds.name !== user || creds.pass !== pass) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).send('Unauthorized');
  }
  next();
}

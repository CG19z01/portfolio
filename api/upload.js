const { put } = require('@vercel/blob');
const { requireAuth } = require('./_lib/auth');

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = requireAuth(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const filename = req.query.filename;
  if (!filename || typeof filename !== 'string') {
    res.status(400).json({ error: 'filename query param is required' });
    return;
  }

  const body = Buffer.isBuffer(req.body) ? req.body : await readRawBody(req);
  if (!body || body.length === 0) {
    res.status(400).json({ error: 'Request body must be the raw image bytes' });
    return;
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blob = await put(`images/${safeName}`, body, {
    access: 'public',
    addRandomSuffix: true,
  });

  res.status(201).json({ url: blob.url });
});

module.exports.config = { api: { bodyParser: false } };

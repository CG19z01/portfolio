const { put } = require('@vercel/blob');
const { requireAuth } = require('./_lib/auth');

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
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: 'Request body must be the raw image bytes' });
    return;
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blob = await put(`images/${safeName}`, req.body, {
    access: 'public',
    addRandomSuffix: true,
  });

  res.status(201).json({ url: blob.url });
});

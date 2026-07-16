const { getSession } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const session = await getSession(req, res);
  res.status(200).json({ authenticated: Boolean(session.authenticated) });
};

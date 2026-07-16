const bcrypt = require('bcryptjs');
const { getSession } = require('./_lib/auth');

const FAIL_DELAY_MS = 800;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password } = req.body || {};
  const hash = process.env.ADMIN_PASSWORD_HASH;

  const valid = typeof password === 'string' && hash
    ? bcrypt.compareSync(password, hash)
    : false;

  if (!valid) {
    await new Promise((resolve) => setTimeout(resolve, FAIL_DELAY_MS));
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  const session = await getSession(req, res);
  session.authenticated = true;
  await session.save();

  res.status(200).json({ authenticated: true });
};

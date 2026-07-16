const { getIronSession } = require('iron-session');

const sessionOptions = {
  cookieName: 'admin_session',
  password: process.env.SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

function getSession(req, res) {
  return getIronSession(req, res, sessionOptions);
}

function requireAuth(handler) {
  return async (req, res) => {
    const session = await getSession(req, res);
    if (!session.authenticated) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    return handler(req, res, session);
  };
}

module.exports = { getSession, requireAuth };

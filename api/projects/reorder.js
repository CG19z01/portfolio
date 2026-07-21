const { writeJson } = require('../_lib/store');
const { getSession } = require('../_lib/auth');

const STORE_KEY = 'data/projects.json';

module.exports = async (req, res) => {
  const session = await getSession(req, res);
  if (!session.authenticated) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { projects } = req.body || {};
  const isValid = Array.isArray(projects) && projects.every((p) => p && typeof p.id === 'string');
  if (!isValid) {
    res.status(400).json({ error: 'projects array is required' });
    return;
  }

  await writeJson(STORE_KEY, projects);
  res.status(200).json(projects);
};

const { readJson, writeJson } = require('../_lib/store');
const { getSession } = require('../_lib/auth');
const { projects: seedProjects } = require('../_lib/seed');

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

  const { ids } = req.body || {};
  if (!Array.isArray(ids)) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }

  const projects = await readJson(STORE_KEY, seedProjects);
  const byId = new Map(projects.map((p) => [p.id, p]));
  const isValidOrder = ids.length === projects.length && ids.every((id) => byId.has(id));
  if (!isValidOrder) {
    res.status(400).json({ error: 'ids must match the existing project ids exactly' });
    return;
  }

  const reordered = ids.map((id) => byId.get(id));
  await writeJson(STORE_KEY, reordered);
  res.status(200).json(reordered);
};

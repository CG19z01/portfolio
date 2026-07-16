const { readJson, writeJson } = require('../_lib/store');
const { getSession } = require('../_lib/auth');
const { skills: seedSkills } = require('../_lib/seed');

const STORE_KEY = 'data/skills.json';

module.exports = async (req, res) => {
  const session = await getSession(req, res);
  if (!session.authenticated) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.query;
  const skills = await readJson(STORE_KEY, seedSkills);
  const index = skills.findIndex((s) => s.id === id);

  if (req.method === 'PUT') {
    if (index === -1) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const { name, pct } = req.body || {};
    skills[index] = {
      ...skills[index],
      ...(name !== undefined && { name }),
      ...(typeof pct === 'number' && { pct: Math.max(0, Math.min(100, pct)) }),
    };
    await writeJson(STORE_KEY, skills);
    res.status(200).json(skills[index]);
    return;
  }

  if (req.method === 'DELETE') {
    if (index === -1) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const [removed] = skills.splice(index, 1);
    await writeJson(STORE_KEY, skills);
    res.status(200).json(removed);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

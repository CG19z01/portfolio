const crypto = require('crypto');
const { readJson, writeJson } = require('./_lib/store');
const { getSession } = require('./_lib/auth');
const { skills: seedSkills } = require('./_lib/seed');

const STORE_KEY = 'data/skills.json';

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const skills = await readJson(STORE_KEY, seedSkills);
    res.status(200).json(skills);
    return;
  }

  if (req.method === 'POST') {
    const session = await getSession(req, res);
    if (!session.authenticated) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, pct } = req.body || {};
    if (!name || typeof pct !== 'number') {
      res.status(400).json({ error: 'name and numeric pct are required' });
      return;
    }

    const skills = await readJson(STORE_KEY, seedSkills);
    const skill = {
      id: crypto.randomUUID(),
      name,
      pct: Math.max(0, Math.min(100, pct)),
    };
    skills.push(skill);
    await writeJson(STORE_KEY, skills);
    res.status(201).json(skill);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

const crypto = require('crypto');
const { readJson, writeJson } = require('./_lib/store');
const { getSession } = require('./_lib/auth');
const { projects: seedProjects } = require('./_lib/seed');

const STORE_KEY = 'data/projects.json';

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const projects = await readJson(STORE_KEY, seedProjects);
    res.status(200).json(projects);
    return;
  }

  if (req.method === 'POST') {
    const session = await getSession(req, res);
    if (!session.authenticated) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { title, desc, img, tags, githubUrl, demoUrl } = req.body || {};
    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const projects = await readJson(STORE_KEY, seedProjects);
    const project = {
      id: crypto.randomUUID(),
      title,
      desc: desc || '',
      img: img || '',
      tags: Array.isArray(tags) ? tags : [],
      githubUrl: githubUrl || '',
      demoUrl: demoUrl || '',
    };
    projects.push(project);
    await writeJson(STORE_KEY, projects);
    res.status(201).json(project);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

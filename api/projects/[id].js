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

  const { id } = req.query;
  const projects = await readJson(STORE_KEY, seedProjects);
  const index = projects.findIndex((p) => p.id === id);

  if (req.method === 'PUT') {
    if (index === -1) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const { title, desc, img, tags, githubUrl, demoUrl } = req.body || {};
    projects[index] = {
      ...projects[index],
      ...(title !== undefined && { title }),
      ...(desc !== undefined && { desc }),
      ...(img !== undefined && { img }),
      ...(Array.isArray(tags) && { tags }),
      ...(githubUrl !== undefined && { githubUrl }),
      ...(demoUrl !== undefined && { demoUrl }),
    };
    await writeJson(STORE_KEY, projects);
    res.status(200).json(projects[index]);
    return;
  }

  if (req.method === 'DELETE') {
    if (index === -1) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const [removed] = projects.splice(index, 1);
    await writeJson(STORE_KEY, projects);
    res.status(200).json(removed);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};

const fs = require('fs');
const path = require('path');

const panelHtml = fs.readFileSync(path.join(__dirname, '_lib', 'panel.html'), 'utf-8');

module.exports = (req, res) => {
  const { secret } = req.query;
  const expected = process.env.ADMIN_PANEL_SLUG;

  if (!expected || secret !== expected) {
    res.status(404).send('Not found');
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(panelHtml);
};

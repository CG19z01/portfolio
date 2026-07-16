const { put, head, BlobNotFoundError } = require('@vercel/blob');

async function readJson(name, defaults) {
  let blob;
  try {
    blob = await head(name);
  } catch (err) {
    if (err instanceof BlobNotFoundError) {
      await writeJson(name, defaults);
      return defaults;
    }
    throw err;
  }

  const res = await fetch(blob.url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch blob ${name}: ${res.status}`);
  }
  return res.json();
}

async function writeJson(name, data) {
  await put(name, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
  return data;
}

module.exports = { readJson, writeJson };

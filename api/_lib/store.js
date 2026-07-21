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

  // Vercel's CDN caches public blob URLs (up to 1 month), so a bare fetch of
  // blob.url can return stale content right after an overwrite. Busting the
  // URL with the blob's own uploadedAt timestamp forces a cache miss whenever
  // the content actually changed, per Vercel's documented workaround.
  const bustedUrl = `${blob.url}?v=${new Date(blob.uploadedAt).getTime()}`;
  const res = await fetch(bustedUrl, { cache: 'no-store' });
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

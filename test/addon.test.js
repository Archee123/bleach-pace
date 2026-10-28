'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../server');
const { createAddon, TRIMMED_ID, CATALOG, labels } = require('../addon');
test('complete classifications, sensitive boundaries, and preserved playback IDs', async () => {
  const addon = createAddon();
  const { meta } = await addon.get('meta', 'series', TRIMMED_ID);
  assert.equal(meta.videos.length, 160);
  const counts = {};
  for (const value of labels.values()) counts[value] = (counts[value] || 0) + 1;
  assert.deepEqual(counts, { Canon: 162, 'Mixed Canon/Filler': 41, Filler: 163 });
  for (const n of [8, 109, 190, 342, 343]) assert.equal(labels.get(n), 'Mixed Canon/Filler');
  for (const n of [33, 64, 108, 341, 355]) assert.equal(labels.get(n), 'Filler');
  assert.equal(labels.get(366), 'Canon');
  assert.equal(meta.videos.at(-1).id, 'tt0434665:16:24');
  for (const v of meta.videos) {
    assert.match(v.title, /^\[(Canon|Filler|Mixed Canon\/Filler)\] Episode \d+$/);
    assert.equal('streams' in v, false);
    assert.equal('available' in v, false);
    assert.match(v.thumbnail, /\/thumbnails\/\d+-\d+\.png$/);
  }
  assert.equal(addon.manifest.resources.some(r => (r.name || r) === 'stream'), false);
  assert.deepEqual(await addon.get('meta', 'series', 'tt0434665'), { meta: null, cacheMaxAge: 300 });
  assert.equal((await addon.get('meta', 'series', 'bleachguide:original')).meta, null);
  assert.equal((await addon.get('catalog', 'series', CATALOG, { search: 'Bleach' })).metas.length, 1);
  for (const extra of [{ search: 'Naruto' }, { skip: '1' }]) assert.deepEqual((await addon.get('catalog', 'series', CATALOG, extra)).metas, []);
  assert.equal((await addon.get('meta', 'movie', TRIMMED_ID)).meta, null);
});
test('real SDK HTTP transport: manifest, CORS, catalog, metadata, unknown IDs', async () => {
  const server = createServer({ baseUrl: 'http://example.test' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const manifest = await fetch(`${base}/manifest.json`);
    assert.equal(manifest.status, 200);
    assert.equal(manifest.headers.get('access-control-allow-origin'), '*');
    const manifestData = await manifest.json();
    assert.equal(manifestData.version, '1.1.4');
    assert.equal(manifestData.logo, 'http://example.test/icon.png');
    assert.equal(manifestData.name, 'Bleach Pace');
    const catalog = await (await fetch(`${base}/catalog/series/${CATALOG}.json`)).json();
    assert.equal(catalog.metas[0].id, TRIMMED_ID);
    assert.equal(catalog.metas.length, 1);
    assert.equal(catalog.metas[0].poster, 'http://example.test/cover-v4.png');
    assert.equal(catalog.metas[0].background, 'http://example.test/background-v3.png');
    assert.equal(catalog.metas[0].logo, 'http://example.test/title-logo.png');
    const cover = await fetch(`${base}/cover-v4.png`);
    assert.equal(cover.headers.get('content-type'), 'image/png');
    const coverBytes = Buffer.from(await cover.arrayBuffer());
    assert.ok(coverBytes.length > 1000 && coverBytes.length < 100000);
    assert.equal(coverBytes.readUInt32BE(16) * 3, coverBytes.readUInt32BE(20) * 2);
    const background = await fetch(`${base}/background-v3.png`);
    assert.equal(background.headers.get('content-type'), 'image/png');
    const backgroundBytes = Buffer.from(await background.arrayBuffer());
    assert.ok(backgroundBytes.length < 500000);
    assert.equal(backgroundBytes.readUInt32BE(16) * 9, backgroundBytes.readUInt32BE(20) * 16);
    const titleLogo = await fetch(`${base}/title-logo.png`);
    assert.equal(titleLogo.headers.get('content-type'), 'image/png');
    const logoBytes = Buffer.from(await titleLogo.arrayBuffer());
    assert.equal(logoBytes[25], 6); // PNG RGBA color type preserves transparency.
    const icon = await fetch(`${base}/icon.png`);
    assert.equal(icon.headers.get('content-type'), 'image/png');
    const iconBytes = Buffer.from(await icon.arrayBuffer());
    assert.equal(iconBytes.readUInt32BE(16), 256);
    assert.equal(iconBytes.readUInt32BE(20), 256);
    const response = await fetch(`${base}/meta/series/${encodeURIComponent(TRIMMED_ID)}.json`);
    assert.match(response.headers.get('cache-control'), /300/);
    const { meta } = await response.json();
    assert.equal(meta.videos[1].title, '[Mixed Canon/Filler] Episode 8');
    // Fetch every image through the real HTTP server to catch missing files,
    // wrong content types, and oversized/invalid image payloads.
    for (const video of meta.videos) {
      const image = await fetch(`${base}${new URL(video.thumbnail).pathname}`);
      assert.equal(image.status, 200, video.id);
      assert.equal(image.headers.get('content-type'), 'image/png');
      assert.equal(image.headers.get('access-control-allow-origin'), '*');
      const data = Buffer.from(await image.arrayBuffer());
      assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', video.id);
      assert.ok(data.length < 5000, video.id);
    }
    const missing = await (await fetch(`${base}/meta/series/bleachguide:unknown.json`)).json();
    assert.equal(missing.meta, null);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
test('Bleach Pace Trimmed selects whole episodes without renumbering or changing canon status', async () => {
  const { meta } = await createAddon().get('meta', 'series', TRIMMED_ID);
  const numbers = meta.videos.map(v => Number(v.title.match(/Episode (\d+)$/)[1]));
  assert.equal(numbers.length, 160);
  for (const n of [1, 8, 9, 16, 32, 110, 366]) assert.ok(numbers.includes(n));
  for (const n of [2, 33, 109, 151, 202, 266, 342, 355]) assert.ok(!numbers.includes(n));
  assert.equal(meta.videos.find(v => v.title.endsWith('Episode 8')).title, '[Mixed Canon/Filler] Episode 8');
  assert.equal(meta.videos.at(-1).id, 'tt0434665:16:24');
});
test('Vercel entry serves landing page and uses public HTTPS artwork URLs', async () => {
  const http = require('node:http');
  const previous = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  process.env.VERCEL_PROJECT_PRODUCTION_URL = 'bleach-pace.example';
  const handler = require('../api/addon');
  if (previous === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  else process.env.VERCEL_PROJECT_PRODUCTION_URL = previous;
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const landing = await (await fetch(base)).text();
    assert.match(landing, /Install in Stremio/);
    assert.match(landing, /navigator.clipboard.writeText/);
    const manifest = await (await fetch(`${base}/manifest.json`)).json();
    assert.equal(manifest.logo, 'https://bleach-pace.example/icon.png');
    const meta = await (await fetch(`${base}/meta/series/${encodeURIComponent(TRIMMED_ID)}.json`)).json();
    assert.equal(meta.meta.poster, 'https://bleach-pace.example/cover-v4.png');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});


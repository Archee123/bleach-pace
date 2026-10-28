'use strict';
const { addonBuilder } = require('stremio-addon-sdk');
const episodes = require('./data/episodes.json');
const classification = require('./data/classifications.json');
const trimmed = require('./data/trimmed.json');
const TRIMMED_ID = 'bleachguide:trimmed-art-v2';
const CATALOG = 'bleach-pace-v2';
function expand(ranges) {
  return ranges.split(',').flatMap(part => {
    const [start, end = start] = part.split('-').map(Number);
    if (!Number.isInteger(start) || start < 1 || end < start || end > 366) throw new Error('Invalid range');
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });
}
const labels = new Map();
for (const [key, label] of [['canon', 'Canon'], ['mixed', 'Mixed Canon/Filler'], ['filler', 'Filler']]) {
  for (const n of expand(classification[key])) {
    if (labels.has(n)) throw new Error(`Duplicate classification: ${n}`);
    labels.set(n, label);
  }
}
if (episodes.length !== 366 || labels.size !== 366) throw new Error('Incomplete Bleach dataset');
const ids = new Set();
episodes.forEach((v, i) => {
  if (v.absolute !== i + 1 || v.id !== `tt0434665:${v.season}:${v.episode}` || ids.has(v.id) || !Number.isFinite(Date.parse(v.released))) throw new Error('Invalid episode mapping');
  ids.add(v.id);
});
const selected = new Set(expand(trimmed.watch));
function createAddon({ baseUrl = process.env.PUBLIC_URL || `http://127.0.0.1:${process.env.PORT || 7000}` } = {}) {
  const origin = baseUrl.replace(/\/$/, '');
  const trimmedPreview = { id: TRIMMED_ID, type: 'series', name: 'Bleach Pace', releaseInfo: '2004-2012', poster: `${origin}/cover-v4.png`, background: `${origin}/background-v3.png`, logo: `${origin}/title-logo.png`, posterShape: 'poster', description: 'Bleach Pace Trimmed watch path, original series only. Whole original episodes selected by bleachpace.com; optional episode 202 is excluded. This route skips some canon and mixed episodes. Canon/filler labels are independently sourced from Anime Filler List. Original episode numbering and stream IDs preserved.' };
  const builder = new addonBuilder({
    id: 'community.bleach.filler.guide', version: '1.1.4', name: 'Bleach Pace',
    logo: `${baseUrl.replace(/\/$/, '')}/icon.png`,
    description: 'A dedicated Bleach page with canon/filler episode labels. No streams provided.',
    types: ['series'], resources: ['catalog', { name: 'meta', types: ['series'], idPrefixes: ['bleachguide:'] }],
    catalogs: [{ type: 'series', id: CATALOG, name: 'Bleach Pace', extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }] }]
  });
  builder.defineCatalogHandler(async ({ type, id, extra = {} }) => ({
    metas: type === 'series' && id === CATALOG && !(Number(extra.skip) > 0) && (!extra.search || /bleach|pace/i.test(extra.search)) ? [{ ...trimmedPreview }] : [],
    cacheMaxAge: 300
  }));
  builder.defineMetaHandler(async ({ type, id }) => ({
    meta: type === 'series' && id === TRIMMED_ID ? {
      ...trimmedPreview,
      videos: episodes.filter(v => selected.has(v.absolute)).map(v => ({
        id: v.id, season: v.season, episode: v.episode, released: v.released,
        title: `[${labels.get(v.absolute)}] Episode ${v.absolute}`,
        thumbnail: `${origin}/thumbnails/${v.season}-${v.episode}.png`,
        overview: `Original Bleach episode ${v.absolute}. Classification: ${labels.get(v.absolute)}. ${labels.get(v.absolute) === 'Mixed Canon/Filler' ? 'Contains adapted manga material as well as original material.' : ''}`.trim()
      }))
    } : null,
    cacheMaxAge: 300
  }));
  return builder.getInterface();
}
module.exports = { createAddon, TRIMMED_ID, CATALOG, labels };


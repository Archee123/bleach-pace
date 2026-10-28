# Bleach Pace for Stremio

**Install:** [bleach-pace.vercel.app](https://bleach-pace.vercel.app/) · [Manifest](https://bleach-pace.vercel.app/manifest.json)

A simple install page and Stremio metadata add-on for the original Bleach series. The catalog contains 160 whole original episodes selected by the default [Bleach Pace Trimmed route](https://bleachpace.com/?path=trimmed), with optional episode 202 excluded. Each episode has a canon/mixed label and a thumbnail. No video streams are supplied.

## Use

Open the deployed homepage and choose **Install in Stremio**, or copy its manifest link into Stremio → Add-ons. Then open **Bleach Pace** under Discover. A compatible installed stream provider is required. The hosted version works while your computer and ChatGPT are closed.

The route deliberately omits some canon and mixed episodes. It selects complete episodes; it does not trim footage. Only original episodes 1–366 are in scope; TYBW, movies and specials are excluded.

## Local development

Node.js 22 or later is required (Node 24 LTS recommended).

```sh
npm ci
npm test
npm start
```

Open http://127.0.0.1:7000/. For local installation, paste the full `http://127.0.0.1:7000/manifest.json` address manually into Stremio. Keep the local server running when using the local manifest. `PORT` changes the listening port. Do not use the local address on a TV or another computer.

## Vercel

Import this repository into Vercel, use framework preset **Other**, and deploy. `vercel.json` configures the Node function and resource routes; `api/addon.js` exports the HTTP handler without starting a persistent server. Tests run during deployment. Assets and source data are bundled; no runtime scraping is needed.

Image URLs use `PUBLIC_URL` when set, otherwise Vercel's `VERCEL_PROJECT_PRODUCTION_URL` (then `VERCEL_URL`). Set `PUBLIC_URL=https://YOUR-DOMAIN` if you use a custom domain. This variable must contain an origin without a path. Redeploy after changing it. The homepage builds its install link from its own public address.

The production manifest and metadata endpoints must be publicly reachable without a Vercel login. Preview deployments may be protected. Install the production URL, not a protected preview. No paid plan or database is required by the implementation; account quotas still apply.

Core endpoints:

```text
/manifest.json
/catalog/series/bleach-pace-v2.json
/meta/series/bleachguide:trimmed-art-v2.json
```

## Stremio limitations

The [official metadata schema](https://stremio.github.io/stremio-addon-sdk/api/responses/meta.html) supports episode titles and overviews but has no standard canon/filler badge. Labels are title text, whose appearance depends on the client.

A metadata add-on cannot patch another add-on's episode list. Open this add-on's unique Bleach Pace entry; Cinemeta and other Bleach pages are unchanged. The custom parent ID is `bleachguide:trimmed-art-v2`.

Playback IDs retain Cinemeta's IMDb season/episode format, e.g. `tt0434665:2:1` for absolute episode 21. The add-on advertises no stream resource and never embeds `video.streams`, because embedded streams suppress requests to other add-ons. Compatible providers can therefore receive the original IDs. Providers using anime-only IDs or another season scheme may return nothing or incorrect matches. Actual stream playback is provider-dependent and not covered by automated tests. Custom parent IDs and gaps can affect library progress and automatic next-episode behavior between clients.

## Data and artwork

Snapshots checked on 2026-10-26:

- `data/trimmed.json`: watch selection from Bleach Pace's public Trimmed route, optional choices off.
- `data/classifications.json`: explicit canon, mixed and filler ranges from [Anime Filler List](https://www.animefillerlist.com/shows/bleach); source displayed update date 2025-11-18. All 366 original episodes classify as 162 canon, 41 mixed and 163 filler. These are community classifications. Mixed includes adapted manga material.
- `data/episodes.json`: minimal [Cinemeta](https://v3-cinemeta.strem.io/meta/series/tt0434665.json) snapshot, season 0 excluded, sorted by season/episode and mapped to absolute 1–366. Observed season counts: 20,21,22,28,18,22,20,16,22,16,7,17,36,51,26,24. Dates preserve source timestamps.
- `public/thumbnails/`: original episode imagery from Metahub, downloaded using **season 1 and absolute episode numbers**, then packaged as PNGs under 5 KB. This image numbering differs from playback numbering. All 160 images are served locally.
- `public/cover-v4.png`: user-supplied finished BLEACH PACE poster, 360×540, full bleed with no bars, under 100 KB. Original supplied file is preserved separately.
- `public/background-v3.png`: supplied [TMDB background](https://image.tmdb.org/t/p/original/ndtziuJPbDgKNjHEk1CTB9VCV6J.jpg), 1600×900, under 500 KB.
- `public/title-logo.png`: transparent Bleach title logo from [Metahub](https://images.metahub.space/logo/medium/tt0434665/img).
- `public/icon.png`: generated simplified Ichigo face, 256×256. Full-resolution source is retained. Prompt: simplified front-facing Ichigo face, orange spiky hair, determined eyes, black collar, bold anime shapes, charcoal background, no text.

No accounts, API keys, tracking, database or streaming media are part of this add-on. Artwork belongs to its respective rights holders. Independent fan project, not affiliated with Stremio, Bleach Pace, or Bleach's creators.

## Checks and updates

`npm test` validates classification coverage and boundaries, Trimmed membership, preserved playback IDs, unsupported requests, real HTTP CORS/caching, all 160 thumbnail payloads, poster/background size and aspect ratio, logo transparency, and the Vercel entry's public HTTPS URLs and landing page. It needs localhost access, but no internet.

Update snapshots manually, verify against their sources, run tests, then commit and deploy. Metadata caches for five minutes; artwork uses versioned filenames. Older library shortcuts may refer to retired metadata IDs—open the current entry from Discover. The Node SDK is pinned at 1.6.10 with patched transitive overrides for path-to-regexp 0.1.13 and tmp 0.2.7; HTTP tests should accompany dependency updates.


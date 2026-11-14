# Development guide

See the [README](../README.md) for a quick start and the [architecture guide](ARCHITECTURE.md) for code responsibilities and API contracts. Coding assistants should also read [AGENTS.md](../AGENTS.md).

## Local setup

1. Install Node.js 24 LTS and npm. The declared npm version is `11.19.1`; check your environment with `node --version` and `npm --version`.
2. Run `npm ci` from the repository root. Use the committed `package-lock.json`; keep dependency changes intentional.
3. Copy `.env.example` to the ignored root `.env` and replace its placeholders with your own values:

   ```dotenv
   OMDB_API_KEY=your_omdb_key
   TMDB_API_KEY=your_tmdb_api_key_or_read_access_token
   ```

4. Run `npm run dev` and open [localhost:3000](http://localhost:3000). Restart the server after changing credentials.

| Setting | Used by | Requirement |
| --- | --- | --- |
| `OMDB_API_KEY` | Server-side OMDb requester | Needed to retrieve IMDb scores; listings use Ingresso.com independently |
| `TMDB_API_KEY` | Server-side title resolver | Optional fallback for missing or unscored title lookups; accepts a v3 key or an `eyJ`-prefixed API Read Access Token |

Do not prefix these names with `NEXT_PUBLIC_`. Keep actual values out of source, fixtures, and logs. `.env*` files are ignored except the placeholder-only `.env.example`. The app has no database setup or migration step.

The repository's [.npmrc](../.npmrc) enables `legacy-peer-deps` to accommodate the existing dependency graph. It also applies Node's `--use-system-ca` to npm scripts so provider HTTPS requests use operating-system trust. Keep these settings when reproducing local behavior.

## Checks

```sh
npm test
npm run lint
npm run typecheck
```

The typecheck script runs the installed compiler with `--noEmit --incremental false`, without fetching another version or writing an incremental build cache.

`npm run lint` uses the ESLint CLI and `eslint.config.cjs`. The configuration preserves the Next/Core Web Vitals and Prettier rules and prevents browser features and shared contracts from importing server or route modules.

For runtime or configuration changes, check the production build and run it locally:

```sh
npm run build
npm start
```

`npm start` requires a successful build. Build output lives in `.next/` and is ignored by Git. These scripts build and serve locally; they do not publish the site.

## Existing tests

[tests/ratings.test.cjs](../tests/ratings.test.cjs) uses `node:test`, `node:assert/strict`, `t.mock.method`, and a small require hook that transpiles application `.ts` files with the installed TypeScript compiler. Transpilation in the test harness does not perform type checking.

Provider fetches are mocked, so the suite needs no live provider keys. Rating coverage protects batching, deduplication, cache expiry, server concurrency, title cleanup, TMDB disambiguation, partial failures, and validation. `tests/api.test.cjs` covers Ingresso.com contracts, city matching, defaults, and provider failures. `tests/catalog.test.cjs` covers filtering/sorting, metadata fallbacks, and session aggregation. Browser lifecycle, geolocation, focus, and responsive presentation are checked manually below.

Read the surrounding tests before making changes. Strengthen a related case when possible, preserve suite order and mock/assertion style, and add only the coverage needed for the changed behavior. Use existing `t.after` cleanup when modifying environment variables.

## Manual checks for affected UI

Run the relevant checks for the behavior being changed. Live results depend on provider availability and current screenings.

1. **City selection:** select a city/UF with cinemas, load its catalog, and reload to confirm the saved city is restored without coordinates or automatic scrolling. Try an unknown city, retry the same input, and check recovery. The displayed/saved city changes only after catalog success, including an empty catalog. Storage failures must not block selection. Browser storage uses `movie-finder-city`; remove that entry in developer tools to test the initial screen.
2. **Geolocation:** test permission allowed and denied. Manual city selection should remain usable after a failure. Cinema distances require coordinates and are absent for manual selection.
3. **Catalog:** test title and genre filters, all sort options, an empty result, clearing filters, and loading more cards. The catalog should appear before rating enrichment finishes.
4. **Movie details:** open a film, inspect its summary, trailer when present, and session rows. Sessions should appear independently of rating completion. Close the dialog, switch films, retry, or change cities while requests are pending; stale responses must not replace the current selection. Session-table sorting persists across selections.
5. **Partial failures:** check that a failed rating lookup does not discard sessions, and a session failure does not hide movie details. Distinguish an unrated film from a missing title or temporarily unavailable provider.
6. **Accessibility and layout:** use the keyboard for city selection, filters, cards, and dialog close. Check narrow and wide screens, visible focus, the skip link, Portuguese accents, and reduced-motion behavior for result scrolling.

## Troubleshooting and boundaries

| Symptom | Inspect |
| --- | --- |
| Catalog loads but ratings fail | Server credentials, OMDb quota/availability, and optional TMDB resolution; provider errors remain retryable |
| City has no results | City spelling/UF and Ingresso.com coverage; city lookup ignores case and accents |
| Location cannot be obtained | Browser permission and Nominatim connectivity; use manual city/UF selection |
| Certificate errors | Node version and operating-system certificate trust used by `.npmrc` |
| Windows development watcher scans drive ancestors | Preserve the drive-root exclusion in [next.config.js](../next.config.js) |
| A recently published score is missing | Missing/unrated responses have a five-minute cache; successful scores have a thirty-minute cache |

Rating caches live in browser-module and server-process memory. They are neither persistent storage nor shared between server instances; a page reload resets the browser cache, and restarting the server resets its cache.

The active app has no Redux store, service worker, or Netlify function. Keep browser features independent of `src/server/`; access providers through the API routes. See the architecture guide for feature ownership and import boundaries.

When changing a command, environment variable, endpoint, or rating rule, update the corresponding docs and describe the checks performed in the change summary.

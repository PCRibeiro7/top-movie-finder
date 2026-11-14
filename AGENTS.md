# Development instructions

## Read first

- [README.md](README.md): purpose, setup, and documentation index.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): commands, testing, and troubleshooting.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): data flow, API contracts, and rating behavior.

## Project boundaries

- This is a Next.js 15 **Pages Router** app with React 18, MUI 6, and mixed TypeScript/JavaScript. Use the existing `pages/` structure.
- The interface targets Brazilian cinema audiences. Preserve Portuguese copy, Brazilian city/UF selection, BRL prices, and distances in kilometers.
- `pages/index.tsx` owns active application state with React hooks. The old Redux store and service-worker files are not part of the active app.
- Ingresso.com provides listings and sessions. OMDb provides displayed IMDb scores. TMDB only resolves titles to IMDb IDs for the rating fallback.

## Where to change things

| Concern | Start here |
| --- | --- |
| Location, catalog loading, and page state | `pages/index.tsx` |
| Catalog, details dialog, and session aggregation | `src/components/MovieCards.tsx` |
| Location form and catalog filters | `src/components/LocationPicker.tsx`, `src/components/Filter.tsx` |
| Details and session presentation | `src/components/MovieInfo.tsx`, `src/components/SessionInfo.tsx` |
| Theme, global styles, document language/fonts | `pages/_app.tsx`, `src/index.css`, `pages/_document.tsx` |
| HTTP API handlers | `pages/api/` |
| Browser rating batching and cache | `src/requests/ratingRequester.ts` |
| Server rating queue and title resolution | `src/requests/omdbRequester.ts`, `src/requests/tmdbRequester.ts` |
| Shared title cleanup, rating statuses, and cache constants | `src/utils/movieRatings.ts` |
| Rating regression coverage | `tests/ratings.test.cjs` |

## Change conventions

- Follow nearby code and `.prettierrc`: four spaces, semicolons, single quotes. Reuse existing components and types; keep changes focused.
- Keep `OMDB_API_KEY` and `TMDB_API_KEY` server-side. Use the ignored `.env` for local values; do not copy credentials into documentation, tests, logs, or client bundles. `.env.local` is not currently ignored.
- Keep catalog rendering independent of rating enrichment. Preserve separate loading, missing-title, unrated, and provider-error states.
- Preserve rating request deduplication, serial client batches, bounded server concurrency, cache expiry, and retryable provider failures. Change shared limits in `src/utils/movieRatings.ts` and review both requesters.
- Preserve cancellation when locations or selected movies change, manual location fallback, and keyboard-accessible forms/dialogs.
- Preserve the Windows development watcher exclusion in `next.config.js` when changing webpack configuration.
- Inspect references before reusing old files. In particular, `netlify/functions/sync-movies/sync-movies.ts` is unfinished and invokes its handler at module load; importing it can send real provider requests.

## Verification

Use Node.js 24 LTS and npm (declared version: `11.19.1`). Keep `package-lock.json` as the dependency lockfile and retain the existing `.npmrc` settings unless the task calls for changing them.

```sh
npm test
npm run lint
```

For TypeScript changes, also run the installed compiler:

```sh
npx --no-install tsc --noEmit --incremental false
```

For runtime/configuration changes, run `npm run build`; for UI changes, follow the relevant manual checks in the development guide.

Before changing tests, read the existing suite. Prefer strengthening a related case; keep its order, names, mocks, assertions, and setup style. The suite uses Node's built-in test runner, `node:assert/strict`, and a TypeScript require hook. Add only coverage needed for changed behavior; do not introduce another framework or shared helpers without a concrete need.

Keep these docs in sync when commands, environment variables, API contracts, or rating behavior change. Report which checks ran and any checks that could not run.

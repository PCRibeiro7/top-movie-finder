# Development instructions

## Read first

- [README.md](README.md): purpose, setup, and documentation index.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): commands, testing, and troubleshooting.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): data flow, API contracts, and rating behavior.

## Project boundaries

- This is a Next.js 15 **Pages Router** app with React 18, MUI 6, and TypeScript application code. Use the existing `pages/` structure.
- The interface targets Brazilian cinema audiences. Preserve Portuguese copy, Brazilian city/UF selection, BRL prices, and distances in kilometers.
- `pages/index.tsx` composes feature hooks and owns filters, catalog sorting, pagination, and focus/scroll behavior. Keep workflow state in the feature hooks; there is no Redux store or service worker.
- Ingresso.com provides listings and sessions. OMDb provides displayed IMDb scores, with the official daily IMDb dataset as a personal/noncommercial fallback. TMDB only resolves titles to IMDb IDs; never display its scores as IMDb scores.

## Where to change things

| Concern | Start here |
| --- | --- |
| Location/catalog workflow and rating enrichment | `src/features/catalog/useMovieCatalog.ts`, `src/features/catalog/service.ts` |
| Location form, geolocation, reverse lookup, storage | `src/features/location/` |
| Catalog filters, sorting, cards, pagination | `pages/index.tsx`, `src/features/catalog/` |
| Details workflow, presentation, session aggregation | `src/features/movie-details/` |
| Theme, tokens, global styles, document language/fonts | `pages/_app.tsx`, `src/styles/tokens.ts`, `src/index.css`, `pages/_document.tsx` |
| HTTP API handlers | `pages/api/` |
| Ingresso.com access and API validation helpers | `src/server/ingresso/client.ts`, `src/server/api.ts` |
| Browser rating batching and cache | `src/features/ratings/client.ts` |
| Server rating queue and title resolution | `src/server/ratings/omdb.ts`, `src/server/ratings/tmdb.ts` |
| Shared contracts, title cleanup, rating statuses/limits | `src/shared/` |
| Regression coverage | `tests/ratings.test.cjs`, `tests/api.test.cjs`, `tests/catalog.test.cjs` |

## Change conventions

- Follow nearby code and `.prettierrc`: four spaces, semicolons, single quotes. Reuse existing components and types; keep changes focused.
- Keep `OMDB_API_KEY` and `TMDB_API_KEY` server-side. Use ignored `.env*` files for local values; do not copy credentials into documentation, tests, logs, or client bundles. `.env.example` contains placeholders only.
- Keep catalog rendering independent of rating enrichment. Preserve separate loading, missing-title, unrated, and provider-error states.
- Preserve rating request deduplication, serial client batches, bounded server concurrency, cache expiry, and retryable provider failures. Change shared limits in `src/shared/ratings.ts` and review both requesters.
- Preserve cancellation when locations or selected movies change, manual location fallback, and keyboard-accessible forms/dialogs.
- Preserve the Windows development watcher exclusion in `next.config.js` when changing webpack configuration.
- Keep feature UI and browser clients out of `src/server/` and `pages/` imports. Shared contracts must remain independent of features and server code; ESLint enforces these boundaries.
- Keep feature styles in collocated CSS Modules. Keep shared tokens, resets, accessibility rules, and utilities global.

## Verification

Use Node.js 24 LTS and npm (declared version: `11.19.1`). Keep `package-lock.json` as the dependency lockfile and retain the existing `.npmrc` settings unless the task calls for changing them.

```sh
npm test
npm run lint
```

For TypeScript changes, also run the installed compiler:

```sh
npm run typecheck
```

For runtime/configuration changes, run `npm run build`; for UI changes, follow the relevant manual checks in the development guide.

Before changing tests, read the existing suite. Prefer strengthening a related case; keep its order, names, mocks, assertions, and setup style. The suite uses Node's built-in test runner, `node:assert/strict`, and a TypeScript require hook. Add only coverage needed for changed behavior; do not introduce another framework or shared helpers without a concrete need.

Keep these docs in sync when commands, environment variables, API contracts, or rating behavior change. Report which checks ran and any checks that could not run.

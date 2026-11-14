# Architecture

## Boundaries and ownership

This is a single-page Next.js 15 Pages Router app with React 18 and MUI 6. There is no database, Redux store, service worker, or background synchronization job.

| Area | Responsibility |
| --- | --- |
| `pages/index.tsx` | Composes feature hooks and UI. Owns filters, catalog sort, visible count, focus, and scrolling. It exports no application state types. |
| `src/features/location/` | City/UF form, saved-city storage, abort-aware geolocation, Nominatim reverse lookup, and city-ID resolution through the app API. |
| `src/features/catalog/` | Location-to-catalog lifecycle, progressive rating enrichment, pure catalog selectors, filters, cards, and loading/error/empty presentation. |
| `src/features/movie-details/` | Selected movie ID, dialog lifecycle, independent rating/session completion, metadata fallbacks, typed session aggregation, and session-table sorting. |
| `src/features/ratings/client.ts` | Browser rating cache, in-flight deduplication, and serial POST batches. |
| `src/server/ingresso/client.ts` | Ingresso.com transport, city matching, catalog/title lookup, and sessions. |
| `src/server/ratings/` | OMDb cache/concurrency queue, optional TMDB title-to-IMDb resolution, and the daily IMDb dataset fallback. |
| `src/server/api.ts`, `pages/api/` | Shared GET/query/error handling and thin route adapters. |
| `src/shared/` | Provider/API contracts, consumed-field runtime validation, location types, rating statuses/policies, and browser JSON transport. |
| `src/components/` | Shared page chrome. |
| `src/styles/tokens.ts`, `pages/_app.tsx` | Shared colors/fonts, MUI theme, and CSS custom properties. |
| CSS Modules, `src/index.css` | Feature/component styles and responsive rules; global resets, shared utilities, and accessibility rules respectively. |

Browser features and shared modules cannot import server or route modules. Shared modules also cannot import features or components. ESLint enforces these boundaries. Provider credentials are read only under `src/server/ratings/`; never expose them with `NEXT_PUBLIC_`.

Provider types describe the fields the app consumes, including nullable optional fields and JSON date strings. Parsers accept unknown JSON, validate consumed shapes, and preserve extra provider fields in successful API responses. Missing/null optional collections are treated as empty by transformations; malformed collection values are provider failures.

## Location and catalog lifecycle

`useMovieCatalog` coordinates one workflow: resolve location → load catalog → commit location → enrich ratings. IO and enrichment live in focused services rather than presentation components.

- Manual selection, geolocation, and retry each create a fresh attempt ID and cancel the preceding attempt, including retries of the same city. Retry repeats the last attempted input/mode.
- Starting an attempt immediately clears the old catalog and invalidates movie details. The page resets filters and visible count to ten; catalog sort persists.
- Automatic location obtains coordinates, calls Nominatim from the browser, and resolves a Brazilian city/UF. Manual selection and saved-city restoration have no coordinates.
- The last successful city stays displayed and saved until the new catalog succeeds, including a valid empty catalog. Storage under `movie-finder-city` contains only `{ city, state }`; storage errors do not block use.
- The catalog renders before enrichment. Each rating batch applies only to its originating attempt. Filter/sort changes reset visible count; rating completion can reorder the catalog without resetting pagination.
- A pending-rating notice counts films across the full current catalog, independent of filters and pagination. Films without a valid score or completed lookup status show loading indicators on their cards; completed unrated, missing-title, and provider-error outcomes stop counting as pending. Movie details show a loading indicator during rating requests while keeping any available score visible.
- Saved-city restoration does not scroll. Explicit searches reveal/focus results, honoring reduced motion.

## Movie details and sessions

`useMovieDetails` stores a selection identity and derives its movie from the current catalog. Catalog rating updates do not restart session requests. The always-mounted controller keeps session-table sorting across film, dialog, and city changes, initially distance ascending.

Rating and session requests settle independently. Closing, changing films, or starting a location attempt aborts sessions and invalidates old UI updates. Shared rating requests may finish and populate their cache. Rating callbacks carry the catalog attempt ID so they cannot alter another city's catalog.

Pure models merge Ingresso metadata with optional OMDb fallbacks and aggregate the first session day. Times are deduplicated and sorted; the minimum positive price is shown. Distances use valid coordinates in kilometers, including zero coordinates. Missing values remain distinct from zero. Presentation formats dates/copy in Portuguese and prices in BRL. Trailer/ticket links retain HTTP(S) checks and open externally.

## HTTP API contracts

Ingresso routes accept only GET. They return 405 with `Allow: GET` for other methods, 400 for missing/blank/repeated query values, and 502 with `{ error: string }` for upstream HTTP, JSON, timeout, or shape failures. Optional `cityId` defaults to `"1"` only when omitted.

| Route | Input | Successful response |
| --- | --- | --- |
| `GET /api/state` | `state` (two letters), `city` | City ID string; 404 when no city matches. Matching ignores case and accents. |
| `GET /api/movies` | Optional `cityId` | Original validated catalog array. |
| `GET /api/movie` | `movie`, optional `cityId` | Exact trimmed-title movie ID or `null`. Retained for compatibility; cards already have IDs. |
| `GET /api/session` | `movieId`, optional `cityId` | Original validated array of session days. Failures return 502, never an error value with HTTP 200. |
| `GET /api/rating` | Nonempty `movieName` | OMDb success or movie-not-found payload; invalid input 400, provider failure 502. |
| `POST /api/rating` | `{ "movieNames": ["Film title"] }` | `{ "ratings": { "Film title": payloadOrNull } }`. Requires 1–10 nonempty strings before exact-input deduplication; invalid batches return 400. Individual failures are `null` in a successful batch. |
| `POST /api/rating` | `{ "movies": [{ "title": "Film title", "originalTitle": "Original title", "releaseYear": 2026 }] }` | `{ "ratings": { "contextKey": payloadOrNull } }`. Requires 1–10 lookup objects; only `title` is required. Keys come from `movieRatingKey`; duplicates share a lookup. Invalid input or supplying both batch formats returns 400. |

The rating endpoint rejects other methods with 405 and `Allow: GET, POST`. Successful response shapes and route names are retained.

Catalog and details use the contextual batch format. Optional original titles and `director` must be strings, release years must be four-digit integers, and `runtimeMinutes` must be a positive integer. Blank original titles/directors are ignored. Context keys include cleaned/lowercase titles, release year, director, and runtime when present, preventing distinct identities from sharing cached results. Recognized anniversary/rerelease suffixes remove the new cinema year from the lookup. Legacy title-only requests retain their original response keys.

## Rating policies and verification

Definitions live in `src/shared/ratings.ts`. Browser and server retain separate module/process-local caches and queues; they are not durable or shared between server instances.

| Policy | Value |
| --- | --- |
| Browser batch size | 10 titles, serial batches |
| Server concurrency | 4 lookups |
| Valid-score cache TTL | 30 minutes |
| Missing/unrated cache TTL | 5 minutes |
| Cache capacity | 500 entries per cache |
| IMDb dataset snapshot TTL | 24 hours, one decoded TSV snapshot per server process |
| Browser rating batch deadline | 20 seconds |
| Server rating provider deadline | 5 seconds shared across OMDb/TMDB/IMDb steps, starting after the concurrency slot is acquired |
| Browser catalog/session and Ingresso provider deadlines | 15 seconds |
| Geolocation deadline | 10 seconds |

Title keys remove recognized screening/re-release labels, normalize whitespace, and lowercase the result. Use `movieRatingKey` for cache and in-flight identity. Valid scores are finite, greater than zero, and at most ten. Loading, rated, unrated, not-found, and unavailable states remain distinct. Malformed/provider/transport failures stay retryable and are not cached as misses.

Matching numeric OMDb scores take precedence. Direct title lookups reject conflicting director/runtime evidence; matching metadata can corroborate an older film despite a new cinema date. Missing/unscored or conflicting records trigger optional TMDB resolution: search both distinct Brazilian/original titles sequentially, require exact normalized title/original-title matches, and prefer candidates agreeing with both names. Multiple candidates are narrowed to the supplied premiere year or preceding year, then checked against director/runtime metadata through movie details with appended credits (at most five candidates). Available metadata must agree; runtimes allow a five-minute difference for cinema cuts. Missing metadata is not proof. A unique older match remains eligible for rereleases; unresolved ambiguity is rejected.

If an identified TMDB film lacks its IMDb link, try IMDb's public title-suggestion endpoint using its canonical titles. Only movie entries with a compatible year are eligible. A unique exact normalized title match can supply the ID. A different display title requires a separate exact-title TMDB search and matching director/runtime evidence, with no conflicting IMDb ID. At most three alternatives are cross-checked; ranking alone never identifies a film. This frontend endpoint is not a versioned API contract, so transport/schema failures remain retryable. All steps share the existing lookup deadline. `TMDB_API_KEY` accepts a v3 API key or an `eyJ`-prefixed bearer token. Both credentials remain server-side, and TMDB scores are never displayed as IMDb scores.

If OMDb still has no numeric score, use a TMDB-resolved IMDb ID or an OMDb ID with compatible title/year metadata to look up IMDb's official `title.ratings.tsv.gz`. Preserve matching OMDb metadata while filling its score; when OMDb has no record, return the same success shape with `imdbID` and `imdbRating`. A reliably resolved ID absent from a successfully loaded dataset is unrated. Unresolved identities remain not found; provider/download/decompression/invalid-score failures remain retryable and are not cached as misses.

For a resolved valid IMDb ID, OMDb's `Incorrect IMDb ID.` response is treated as an unindexed record and may fall back to the daily dataset. Other OMDb failures also allow a verified dataset score to succeed, but remain provider errors if the dataset has no score. Resolved-ID metadata does not impose the cinema release-year constraint again.

An initial OMDb title-request failure, including quota exhaustion, also attempts recovery when `TMDB_API_KEY` is configured. The existing resolver must verify an IMDb ID before the dataset is queried; a second OMDb request is skipped. A dataset score returns the usual success shape. Missing identity, a missing dataset score, or failed recovery remains a retryable provider error and is not cached as missing/unrated. Recovery uses the original lookup deadline; an already expired deadline does not start another provider step.

The [IMDb dataset](https://data.imdb.com/non-commercial-datasets/) is restricted to personal/noncommercial use and refreshed daily. Its on-demand gzip download is decompressed as a stream and retained as one TSV snapshot, without disk storage or additional credentials. Exact ID row lookups avoid a large per-film object index. Concurrent callers share one download with its own five-second deadline; each caller waits only within its existing lookup deadline, and cancelling one waiter does not abort the shared download. Snapshots are replaced only after decoding and header validation succeed. Failed loads can be retried immediately; expired snapshots are refreshed rather than served as fresh data.

`npm test` runs focused rating, API, and pure catalog/session model coverage using Node's test runner and mocked fetches. `npm run lint` checks rules and import boundaries; `npm run typecheck` checks types separately from test transpilation. Run `npm run build` for runtime/configuration changes and the browser checklist in [DEVELOPMENT.md](DEVELOPMENT.md) for lifecycle, accessibility, and layout changes. Preserve the Windows watcher exclusion in `next.config.js`.

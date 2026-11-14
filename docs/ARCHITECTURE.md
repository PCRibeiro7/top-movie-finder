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
| `src/server/ratings/` | OMDb cache/concurrency queue and optional TMDB title-to-IMDb resolution. |
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

The rating endpoint rejects other methods with 405 and `Allow: GET, POST`. Successful response shapes and route names are retained.

## Rating policies and verification

Definitions live in `src/shared/ratings.ts`. Browser and server retain separate module/process-local caches and queues; they are not durable or shared between server instances.

| Policy | Value |
| --- | --- |
| Browser batch size | 10 titles, serial batches |
| Server concurrency | 4 lookups |
| Valid-score cache TTL | 30 minutes |
| Missing/unrated cache TTL | 5 minutes |
| Cache capacity | 500 entries per cache |
| Browser rating batch deadline | 20 seconds |
| Server rating provider deadline | 5 seconds shared across OMDb/TMDB steps, starting after the concurrency slot is acquired |
| Browser catalog/session and Ingresso provider deadlines | 15 seconds |
| Geolocation deadline | 10 seconds |

Title keys remove recognized screening/re-release labels, normalize whitespace, and lowercase the result. Use `movieRatingKey` for cache and in-flight identity. Valid scores are finite, greater than zero, and at most ten. Loading, rated, unrated, not-found, and unavailable states remain distinct. Malformed/provider/transport failures stay retryable and are not cached as misses.

OMDb supplies IMDb scores. Optional TMDB resolution accepts exactly one normalized title/original-title match with a valid IMDb ID before retrying OMDb; TMDB scores are never displayed as IMDb scores. `TMDB_API_KEY` accepts a v3 API key or an `eyJ`-prefixed bearer token. Both credentials remain server-side.

`npm test` runs focused rating, API, and pure catalog/session model coverage using Node's test runner and mocked fetches. `npm run lint` checks rules and import boundaries; `npm run typecheck` checks types separately from test transpilation. Run `npm run build` for runtime/configuration changes and the browser checklist in [DEVELOPMENT.md](DEVELOPMENT.md) for lifecycle, accessibility, and layout changes. Preserve the Windows watcher exclusion in `next.config.js`.

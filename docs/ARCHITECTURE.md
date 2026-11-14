# Architecture

## Application structure

The active application uses the Next.js Pages Router. It has one page and five API routes, with no database or durable application cache.

| Source | Responsibility |
| --- | --- |
| [`pages/index.tsx`](../pages/index.tsx) | Owns `HomeState`, location selection, catalog loading, sorting, and progressive rating enrichment. Exports shared UI state types. |
| [`pages/_app.tsx`](../pages/_app.tsx) | Applies the MUI theme, `CssBaseline`, global CSS, and page metadata. |
| [`pages/_document.tsx`](../pages/_document.tsx) | Sets the document language to `pt-BR` and loads Google fonts. |
| [`src/components/LocationPicker.tsx`](../src/components/LocationPicker.tsx) | Collects a Brazilian city/UF or starts browser geolocation. |
| [`src/components/Filter.tsx`](../src/components/Filter.tsx) | Updates title and genre filters. |
| [`src/components/MovieCards.tsx`](../src/components/MovieCards.tsx) | Filters/sorts the catalog, expands visible results, and loads the selected movie's details and sessions. |
| [`src/components/MovieInfo.tsx`](../src/components/MovieInfo.tsx) | Renders movie metadata, ratings, synopsis, and trailer link. |
| [`src/components/SessionInfo.tsx`](../src/components/SessionInfo.tsx) | Renders sortable cinema rows, showtimes, distances, prices, and a ticket link. |
| [`src/index.css`](../src/index.css) | Defines global styling and responsive layouts. |
| [`src/types/`](../src/types/) | Describes provider payloads; types do not validate incoming JSON at runtime. |

State lives in React hooks and is passed through props. A successful city selection is stored as `{ city, state }` in browser `localStorage` under `movie-finder-city`. Storage failures are tolerated. Coordinates are held in page state, and manual city selection does not provide cinema distances.

## Data flow

1. The user enters a city/UF or explicitly requests geolocation. The geolocation path calls Nominatim directly from the browser to resolve coordinates to a Brazilian city/UF.
2. The browser calls `/api/state` to resolve an Ingresso.com city ID, then `/api/movies` to load its catalog. City matching ignores case and accents in [`cityIdRequester.ts`](../src/requests/cityIdRequester.ts).
3. The catalog renders before rating lookups complete. The page enriches titles in batches through [`ratingRequester.ts`](../src/requests/ratingRequester.ts) and `/api/rating`; rating completion can reorder cards when sorting by rating.
4. Selecting a card loads its rating and `/api/session` independently with `Promise.allSettled`. A session failure does not discard available movie details. Closing the dialog or changing the city cancels the active session request; shared rating requests can finish and populate their cache.
5. Session rows are built from the first returned session day. Room times are deduplicated and sorted, the minimum positive session price is shown, and distances are calculated when both user and theater coordinates exist.

Ingresso.com supplies the catalog, cinema sessions, and most movie metadata. OMDb supplies IMDb scores and supplementary metadata. Optional TMDB lookup resolves an uncertain title to an IMDb ID before another OMDb request; TMDB scores are not used as IMDb scores. Trailer and ticket links open provider URLs externally.

Provider calls are implemented in [`src/requests/`](../src/requests/). Active provider credentials are server-side `OMDB_API_KEY` and optional `TMDB_API_KEY`. Keep credential-bearing request modules out of browser imports.

## API surface

The table describes current behavior. Validation and error handling differ across routes.

| Route | Input | Success response | Validation and failures |
| --- | --- | --- | --- |
| [`GET /api/state`](../pages/api/state.ts) | Query: `state`, `city` | JSON city ID string | Requires a two-letter state and nonempty city; 400 for invalid inputs, 404 for no matching city, 502 for upstream failure. Does not restrict the HTTP method. |
| [`GET /api/movies`](../pages/api/movies.ts) | Query: optional `cityId` (defaults to `"1"`) | Ingresso.com catalog payload, normally `Movie[]` | No method restriction or runtime query validation. The requester does not check the upstream HTTP status. |
| [`GET /api/movie`](../pages/api/movie.ts) | Query: `movie`, optional `cityId` (defaults to `"1"`) | Movie ID or `null`, using an exact trimmed-title match | No method restriction or runtime query validation. Retained route; the current card flow already has the movie ID. |
| [`GET /api/session`](../pages/api/session.ts) | Query: `movieId`, optional `cityId` (defaults to `"1"`) | Ingresso.com sessions payload, normally an array of days | No method restriction or runtime query validation. The requester catches fetch/JSON errors and returns the error value; the handler still sends 200. The UI rejects non-array results. |
| [`GET /api/rating`](../pages/api/rating.ts) | Query: nonempty string `movieName` | OMDb success or movie-not-found payload | 400 for invalid input; 502 for provider failure. |
| [`POST /api/rating`](../pages/api/rating.ts) | JSON: `{ "movieNames": ["Film title"] }` | `{ "ratings": { "Film title": payloadOrNull } }` | Requires 1–10 nonempty strings before deduplication; invalid batches return 400. Exact duplicate inputs are collapsed. Individual provider failures become `null` while the batch returns 200. |

The rating endpoint rejects other methods with 405 and `Allow: GET, POST`. Older Ingresso.com routes can propagate unhandled errors rather than returning the structured failures used by `/api/state` and `/api/rating`.

## Rating invariants

Shared definitions live in [`src/utils/movieRatings.ts`](../src/utils/movieRatings.ts).

| Setting | Value |
| --- | --- |
| `RATING_BATCH_SIZE` | 10 titles |
| `RATING_CACHE_TTL` | 30 minutes for valid scores |
| `RATING_MISS_CACHE_TTL` | 5 minutes for missing/unrated results |
| `RATING_CACHE_LIMIT` | 500 entries per cache |
| `MAX_CONCURRENT_REQUESTS` in [`omdbRequester.ts`](../src/requests/omdbRequester.ts) | 4 server lookups |

- Title keys remove recognized screening/re-release labels, normalize whitespace, and lowercase the result. Use `movieRatingKey` consistently for cache and in-flight deduplication.
- Browser and server each hold module-level caches and share in-flight lookups. These caches are process/module-local and do not persist across restarts or coordinate separate server instances.
- The browser queues titles into serial POST batches. Successful titles are cached independently; a partial batch failure can retry without refetching successful entries.
- Server lookups use OMDb title search first. An unresolved or unscored title can fall back to TMDB when configured. The resolver requires exactly one normalized title/original-title match and a valid IMDb ID; ambiguous matches are skipped.
- `TMDB_API_KEY` accepts an API key or an `eyJ`-prefixed bearer token. The resolver passes an API key in the query or a bearer token in the authorization header.
- A server lookup has one 5-second provider deadline shared by all OMDb/TMDB steps, starting after its concurrency slot is acquired. Browser rating batches time out after 20 seconds. Catalog/session browser reads and the city-provider request use 15-second deadlines; geolocation uses 10 seconds. Older catalog/session provider requesters have no explicit deadline.
- Scores are valid only when finite and greater than 0 and at most 10. Keep `rated`, `unrated`, `not-found`, and `unavailable` distinct. Transport/provider failures are retriable and are not cached as movie-not-found results.

The focused suite in [`tests/ratings.test.cjs`](../tests/ratings.test.cjs) protects batching, cache expiry, concurrency limits, title resolution, failure isolation, and API validation.

## Legacy and experimental files

- [`src/store.js`](../src/store.js) is an unused Redux/router setup and references a missing reducers module. The active application does not use a Redux provider.
- [`src/serviceWorker.js`](../src/serviceWorker.js), [`src/utils/getMyLocation.js`](../src/utils/getMyLocation.js), [`src/requests/cityNameRequester.js`](../src/requests/cityNameRequester.js), [`src/requests/omdbTryHardRequester.ts`](../src/requests/omdbTryHardRequester.ts), and [`src/components/GenreHelpList.tsx`](../src/components/GenreHelpList.tsx) are inactive leftovers. The legacy city-name requester contains a hardcoded credential-like value; do not reuse or copy it into documentation or fixtures.
- [`netlify/functions/sync-movies/sync-movies.ts`](../netlify/functions/sync-movies/sync-movies.ts) is an unfinished experiment with a fixed Rio de Janeiro lookup. It computes ratings without persisting them and invokes its handler at module scope, so importing or executing it can make external requests. It is not part of the normal page/API flow.
- [`next.config.js`](../next.config.js) contains a Windows-only development watcher exclusion for direct drive-root entries. Preserve its existing Next.js exclusions when modifying watcher behavior.

# Top Movie Finder

**Vai ver o quê?** helps people find films showing in Brazilian cinemas, compare IMDb ratings, and choose a nearby screening. The interface is in Brazilian Portuguese.

- Choose a city and state manually or use browser geolocation.
- Browse Ingresso.com listings, filter by title or genre, and sort by rating, title, or release date.
- Open movie details, trailers, cinema showtimes, and available prices. Approximate cinema distances appear when geolocation is available.
- Load the catalog first and enrich ratings in the background, with distinct loading, missing-title, unrated, and provider-error states.

Built with Next.js 15 (Pages Router), React 18, TypeScript, and MUI 6. The active app uses React hooks for state and Next.js API routes for provider requests.

## Quick start

Use **Node.js 24 LTS** and npm. `package.json` declares npm `11.19.1`; dependencies are locked in `package-lock.json`.

```sh
npm ci
```

Copy `.env.example` to `.env` in the repository root and fill in your values:

```dotenv
OMDB_API_KEY=your_omdb_key
TMDB_API_KEY=your_tmdb_api_key_or_read_access_token
```

`OMDB_API_KEY` enables IMDb rating retrieval through [OMDb](https://www.omdbapi.com/apikey.aspx). `TMDB_API_KEY` is optional: it uses [TMDB](https://www.themoviedb.org/settings/api) to resolve translated/original titles to a unique IMDb ID before retrying OMDb. It accepts a v3 API key or an API Read Access Token. Both credentials stay on the server; configure them in the hosting environment when running there.

When OMDb has no score for an identified film, the server falls back to [IMDb's official daily ratings dataset](https://data.imdb.com/non-commercial-datasets/). If the initial OMDb request fails, including quota exhaustion, a configured `TMDB_API_KEY` lets the server resolve an IMDb ID and try the dataset without another OMDb request. Failed recovery remains retryable. This dataset is limited to personal/noncommercial use and requires no additional key. Its gzip snapshot is downloaded on demand and cached in server memory for 24 hours. A cold lookup downloads about 9 MB compressed (about 30 MB decoded); the server needs outbound HTTPS access to `datasets.imdbws.com`. TMDB scores are never presented as IMDb ratings.

Director and runtime metadata help distinguish films with the same title; anniversary/rerelease listings do not use the new cinema date as the film's original release year. If TMDB identifies a film but lacks its IMDb link, the server also uses IMDb's public title suggestions at `v3.sg.media-imdb.com`. A different displayed title requires a matching TMDB canonical title and corroborating director/runtime metadata; search ranking alone is never sufficient.

Environment files (`.env*`) are ignored, with `.env.example` retained as a placeholder-only template.

```sh
npm run dev
```

Open [localhost:3000](http://localhost:3000). Choose a Brazilian city/UF to browse films. Listings and sessions require access to Ingresso.com; automatic location also calls OpenStreetMap Nominatim from the browser.

The existing `.npmrc` enables `legacy-peer-deps` for dependency compatibility and `--use-system-ca` for HTTPS requests made by npm scripts using the operating system's trusted certificates.

## Common commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local Next.js development server |
| `npm test` | Run API, catalog/session model, and rating regressions with mocked provider requests |
| `npm run lint` | Run ESLint, including browser/server import boundaries |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run build` | Build the production app locally |
| `npm start` | Serve a completed production build locally |

## Development documentation

- [Development guide](docs/DEVELOPMENT.md): setup details, checks, manual testing, and troubleshooting.
- [Architecture](docs/ARCHITECTURE.md): source map, provider flow, API contracts, rating caches, and known limitations.
- [Agent instructions](AGENTS.md): project-specific guidance for coding assistants.

Start with `pages/index.tsx` for page composition, `src/features/` for UI and browser workflows, `pages/api/` for HTTP handlers, and `src/server/` for provider access. Shared contracts and rating policies live in `src/shared/`. Feature styles use CSS Modules; theme tokens live in `src/styles/tokens.ts`.

## License

See [LICENSE](LICENSE) for the GNU General Public License, version 3.

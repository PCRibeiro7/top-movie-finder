# top-movie-finder

website for finding good movies to watch nearby

Use Node.js 24 LTS and install dependencies with npm:

```sh
npm ci
```

Create a `.env` file with your provider keys (also configure these on your host):

```dotenv
OMDB_API_KEY=your_omdb_key
TMDB_API_KEY=your_tmdb_api_key_or_read_access_token
```

OMDb supplies IMDb ratings. The optional TMDB key enables a fallback for
translated and original titles: a unique matching film's IMDb ID is used to
query OMDb. The TMDB credential can be a v3 API key or an API Read Access Token.
Get keys from [OMDb](https://www.omdbapi.com/apikey.aspx) and
[TMDB](https://www.themoviedb.org/settings/api). Both keys stay on the server.

Screening labels such as anniversary editions and debate sessions are removed
before looking up a title. Cards distinguish ratings still loading, titles not
found, films without a published score, and temporary provider errors. Missing
scores are cached for five minutes; provider errors are not cached.

The project enables `legacy-peer-deps` in `.npmrc` to keep its existing
dependency versions despite incompatible peer requirements.
It also enables Node's system certificate store for npm scripts so HTTPS
requests can use certificates trusted by Windows and other operating systems.

Start the development server:

```sh
npm run dev
```

Build and run the production server:

```sh
npm run build
npm start
```

Run the rating flow regression checks:

```sh
npm test
```

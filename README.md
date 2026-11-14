# top-movie-finder

website for finding good movies to watch nearby

Use Node.js 24 LTS and install dependencies with npm:

```sh
npm ci
```

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

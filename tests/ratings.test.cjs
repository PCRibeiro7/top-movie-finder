const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { setImmediate } = require('node:timers/promises');
const { test } = require('node:test');
const ts = require('typescript');

// Load the app's TypeScript with its existing compiler, without a test framework.
require.extensions['.ts'] = (module, filename) => {
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    module._compile(outputText, filename);
};

const { getMovieRating } = require('../src/requests/ratingRequester.ts');
const { default: omdbRequest } = require('../src/requests/omdbRequester.ts');
const { default: handler } = require('../pages/api/rating.ts');
const {
    RATING_BATCH_SIZE,
    RATING_CACHE_TTL,
    RATING_MISS_CACHE_TTL,
} = require('../src/utils/movieRatings.ts');

test('client batches unique titles serially and shares cached and in-flight ratings', async (t) => {
    const batches = [];
    let active = 0;
    let maxActive = 0;
    t.mock.method(global, 'fetch', async (url, options) => {
        assert.equal(url, '/api/rating');
        assert.equal(options.method, 'POST');
        const { movieNames } = JSON.parse(options.body);
        batches.push(movieNames);
        maxActive = Math.max(maxActive, ++active);
        await setImmediate();
        active--;
        return Response.json({
            ratings: Object.fromEntries(movieNames.map((name) => [
                name, { Response: 'True', imdbRating: '8.1', Title: name },
            ])),
        });
    });
    const names = Array.from({ length: 23 }, (_, index) => `Client movie ${index}`);
    const requests = names.map(getMovieRating);
    await setImmediate();
    assert.equal(getMovieRating('  CLIENT   MOVIE 0 '), requests[0]);

    const ratings = await Promise.all(requests);
    assert.equal(ratings.length, 23);
    assert.deepEqual(batches.map((batch) => batch.length), [10, 10, 3]);
    assert.equal(maxActive, 1);
    assert.deepEqual(await getMovieRating(names[0]), ratings[0]);
    assert.equal(batches.length, 3);
});

test('client expires cached results and retries partial failures without refetching successes', async (t) => {
    let now = Date.now();
    t.mock.method(Date, 'now', () => now);
    const batches = [];
    t.mock.method(global, 'fetch', async (_url, options) => {
        const { movieNames } = JSON.parse(options.body);
        batches.push(movieNames);
        return Response.json({
            ratings: Object.fromEntries(movieNames.map((name) => [
                name,
                name === 'Client missing'
                    ? { Response: 'False', Error: 'Movie not found!' }
                    : name === 'Client unrated'
                      ? { Response: 'True', imdbRating: 'N/A' }
                      : name === 'Client retry' && batches.length === 1
                        ? null
                        : { Response: 'True', imdbRating: '7.5' },
            ])),
        });
    });

    const results = await Promise.allSettled([
        getMovieRating('Client success'),
        getMovieRating('Client missing'),
        getMovieRating('Client retry'),
        getMovieRating('Client unrated'),
    ]);
    assert.deepEqual(results.map((result) => result.status), [
        'fulfilled', 'fulfilled', 'rejected', 'fulfilled',
    ]);
    await getMovieRating('Client missing');
    await getMovieRating('Client unrated');
    assert.equal(batches.length, 1);
    await getMovieRating('Client retry');
    assert.deepEqual(batches[1], ['Client retry']);

    now += RATING_MISS_CACHE_TTL + 1;
    await Promise.all([
        getMovieRating('Client missing'),
        getMovieRating('Client unrated'),
    ]);
    assert.deepEqual(batches[2], ['Client missing', 'Client unrated']);
    await getMovieRating('Client success');
    assert.equal(batches.length, 3);
    now += RATING_CACHE_TTL;
    await getMovieRating('Client success');
    assert.deepEqual(batches[3], ['Client success']);
});

test('provider cleans screening labels, deduplicates lookups, limits concurrency, and expires its cache', async (t) => {
    let now = Date.now();
    t.mock.method(Date, 'now', () => now);
    const titles = [];
    let active = 0;
    let maxActive = 0;
    t.mock.method(global, 'fetch', async (url) => {
        const title = new URL(url).searchParams.get('t');
        titles.push(title);
        maxActive = Math.max(maxActive, ++active);
        await setImmediate();
        active--;
        return Response.json({ Response: 'True', imdbRating: '8.0', Title: title });
    });
    const names = [
        'A&B: Part-2',
        'Cars (20th Anniversary)',
        'The Fast and the Furious (25º Aniversário)',
        '  Sessão Debate: Fiz Um Foguete Imaginando Que Você Vinha',
        'Pré-Estreia Com Debate: Os Irmãos Segreto',
        ...Array.from({ length: 7 }, (_, index) => `Provider ${index}`),
    ];
    const requests = names.map(omdbRequest);
    assert.equal(omdbRequest('  a&b:   part-2 '), requests[0]);
    assert.equal(omdbRequest('Cars'), requests[1]);

    const ratings = await Promise.all(requests);
    assert.equal(titles.length, names.length);
    assert.deepEqual(titles.slice(0, 5), [
        'A&B: Part-2',
        'Cars',
        'The Fast and the Furious',
        'Fiz Um Foguete Imaginando Que Você Vinha',
        'Os Irmãos Segreto',
    ]);
    assert.equal(maxActive, 4);
    assert.deepEqual(await omdbRequest(names[0]), ratings[0]);
    assert.equal(titles.length, names.length);
    now += RATING_CACHE_TTL + 1;
    await omdbRequest(names[0]);
    assert.equal(titles.length, names.length + 1);
});

test('provider resolves missing or unscored titles by IMDb ID and skips ambiguous or unrelated matches', async (t) => {
    const previousKey = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = 'test-tmdb-key';
    t.after(() => {
        if (previousKey === undefined) delete process.env.TMDB_API_KEY;
        else process.env.TMDB_API_KEY = previousKey;
    });
    const ids = [];
    const signals = new Map();
    t.mock.method(global, 'fetch', async (url, options) => {
        const { hostname, pathname, searchParams } = new URL(url);
        if (hostname === 'www.omdbapi.com') {
            const title = searchParams.get('t');
            if (title) {
                signals.set(title, options.signal);
                if (title === 'Gioia Mia') {
                    return Response.json({ Response: 'True', Title: 'Tutto Apposto Gioia Mia', imdbRating: 'N/A' });
                }
                return Response.json({ Response: 'False', Error: 'Movie not found!' });
            }
            const id = searchParams.get('i');
            ids.push(id);
            assert.equal(options.signal, signals.get(
                id === 'tt0040737' ? 'Arroz Amargo' : id === 'tt0048021' ? 'Du rififi chez les hommes' : 'Gioia Mia',
            ));
            return Response.json({ Response: 'True', imdbRating: '8.1', imdbID: id });
        }
        assert.equal(hostname, 'api.themoviedb.org');
        assert.equal(searchParams.get('api_key'), 'test-tmdb-key');
        if (pathname === '/3/search/movie') {
            assert.equal(searchParams.get('language'), 'pt-BR');
            const title = searchParams.get('query');
            assert.equal(options.signal, signals.get(title));
            return Response.json({ results:
                title === 'Arroz Amargo'
                    ? [
                        { id: 1, title: 'Arroz doce', original_title: 'A different movie' },
                        { id: 2, title: 'Arroz amargo', original_title: 'Riso amaro' },
                    ]
                    : title === 'Du rififi chez les hommes'
                      ? [{ id: 3, title: 'Rififi', original_title: 'Du rififi chez les hommes' }]
                      : title === 'Gioia Mia'
                        ? [{ id: 8, title: 'Meu Verão Na Sicília', original_title: 'Gioia Mia' }]
                        : title === 'Resolver ambiguous'
                          ? [
                              { id: 4, title, original_title: title },
                              { id: 5, title, original_title: title },
                          ]
                          : [{ id: 6, title: 'Resolver unrelated 2', original_title: 'Resolver unrelated 2' }],
            });
        }
        assert.ok(['/3/movie/2/external_ids', '/3/movie/3/external_ids', '/3/movie/8/external_ids'].includes(pathname));
        return Response.json({ imdb_id:
            pathname === '/3/movie/2/external_ids' ? 'tt0040737' : pathname === '/3/movie/3/external_ids' ? 'tt0048021' : 'tt1234568',
        });
    });

    const ratings = await Promise.all([
        'Arroz Amargo', 'Du rififi chez les hommes', 'Gioia Mia', 'Resolver ambiguous', 'Resolver unrelated 3',
    ].map(omdbRequest));
    assert.deepEqual(ratings.map((rating) => rating.Response), ['True', 'True', 'True', 'False', 'False']);
    assert.deepEqual(ids.sort(), ['tt0040737', 'tt0048021', 'tt1234568']);
    await omdbRequest('Arroz Amargo');
    assert.equal(ids.length, 3);
});

test('provider retries resolver failures immediately and refreshes films without scores after the miss TTL', async (t) => {
    const previousKey = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = 'eyJtest-read-access-token';
    t.after(() => {
        if (previousKey === undefined) delete process.env.TMDB_API_KEY;
        else process.env.TMDB_API_KEY = previousKey;
    });
    let now = Date.now();
    t.mock.method(Date, 'now', () => now);
    let attempts = 0;
    t.mock.method(global, 'fetch', async (url, options) => {
        const { hostname, pathname, searchParams } = new URL(url);
        if (hostname === 'www.omdbapi.com') {
            return Response.json(searchParams.has('i')
                ? { Response: 'True', imdbRating: attempts === 2 ? 'N/A' : '7.4' }
                : { Response: 'False', Error: 'Movie not found!' });
        }
        assert.equal(searchParams.has('api_key'), false);
        assert.equal(options.headers.Authorization, 'Bearer eyJtest-read-access-token');
        if (pathname === '/3/search/movie') {
            attempts++;
            return attempts === 1
                ? Response.json({ status_message: 'Invalid API key' }, { status: 401 })
                : Response.json({ results: [{ id: 7, title: 'Resolver retry', original_title: 'Resolver retry' }] });
        }
        return Response.json({ imdb_id: 'tt1234567' });
    });

    await assert.rejects(omdbRequest('Resolver retry'), /Title resolver unavailable/);
    assert.equal((await omdbRequest('Resolver retry')).imdbRating, 'N/A');
    await omdbRequest('Resolver retry');
    assert.equal(attempts, 2);
    now += RATING_MISS_CACHE_TTL + 1;
    assert.equal((await omdbRequest('Resolver retry')).imdbRating, '7.4');
    assert.equal(attempts, 3);
});

test('API isolates provider failures, caches missing movies, and reuses batch results for GET', async (t) => {
    let now = Date.now();
    t.mock.method(Date, 'now', () => now);
    const titles = [];
    t.mock.method(global, 'fetch', async (url) => {
        const title = new URL(url).searchParams.get('t');
        titles.push(title);
        return Response.json(
            title === 'API missing'
                ? { Response: 'False', Error: 'Movie not found!' }
                : title === 'API unavailable'
                  ? { Response: 'False', Error: 'Request limit reached!' }
                  : { Response: 'True', imdbRating: '9.0' },
        );
    });
    const res = {
        code: 0,
        body: null,
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; },
    };

    await handler({ method: 'POST', body: {
        movieNames: ['API good', 'API missing', 'API unavailable'],
    } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.ratings['API good'].imdbRating, '9.0');
    assert.equal(res.body.ratings['API missing'].Response, 'False');
    assert.equal(res.body.ratings['API unavailable'], null);

    await handler({ method: 'GET', query: { movieName: 'API GOOD' } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.imdbRating, '9.0');
    await handler({ method: 'GET', query: { movieName: 'API missing' } }, res);
    assert.equal(titles.length, 3);
    await handler({ method: 'GET', query: { movieName: 'API unavailable' } }, res);
    assert.equal(res.code, 502);
    assert.equal(titles.length, 4);

    now += RATING_MISS_CACHE_TTL + 1;
    await handler({ method: 'GET', query: { movieName: 'API missing' } }, res);
    assert.equal(titles.length, 5);
});

test('API rejects invalid batches, ambiguous query values, and unsupported methods before fetching', async (t) => {
    const fetch = t.mock.method(global, 'fetch', () => {
        throw new Error('Invalid requests must not reach the provider');
    });
    const requests = [
        { method: 'POST', body: {} },
        { method: 'POST', body: { movieNames: [] } },
        { method: 'POST', body: { movieNames: Array(RATING_BATCH_SIZE + 1).fill('Movie') } },
        { method: 'POST', body: { movieNames: ['Movie', ' '] } },
        { method: 'POST', body: { movieNames: [1] } },
        { method: 'GET', query: {} },
        { method: 'GET', query: { movieName: ['One', 'Two'] } },
        { method: 'DELETE' },
    ];
    for (const req of requests) {
        const res = {
            code: 0,
            status(code) { this.code = code; return this; },
            json() {},
            setHeader(name, value) {
                assert.equal(name, 'Allow');
                assert.deepEqual(value, ['GET', 'POST']);
            },
        };
        await handler(req, res);
        assert.equal(res.code, req.method === 'DELETE' ? 405 : 400);
    }
    assert.equal(fetch.mock.callCount(), 0);
});

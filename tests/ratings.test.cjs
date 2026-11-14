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
    ]);
    assert.deepEqual(results.map((result) => result.status), [
        'fulfilled', 'fulfilled', 'rejected',
    ]);
    await getMovieRating('Client missing');
    assert.equal(batches.length, 1);
    await getMovieRating('Client retry');
    assert.deepEqual(batches[1], ['Client retry']);

    now += RATING_MISS_CACHE_TTL + 1;
    await getMovieRating('Client missing');
    await getMovieRating('Client success');
    assert.equal(batches.length, 3);
    now += RATING_CACHE_TTL;
    await getMovieRating('Client success');
    assert.deepEqual(batches[3], ['Client success']);
});

test('provider deduplicates lookups, encodes titles, limits concurrency, and expires its cache', async (t) => {
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
    const names = ['A&B: Part-2', ...Array.from({ length: 11 }, (_, index) => `Provider ${index}`)];
    const requests = names.map(omdbRequest);
    assert.equal(omdbRequest('  a&b:   part-2 '), requests[0]);

    const ratings = await Promise.all(requests);
    assert.equal(titles.length, names.length);
    assert.equal(titles[0], names[0]);
    assert.equal(maxActive, 4);
    assert.deepEqual(await omdbRequest(names[0]), ratings[0]);
    assert.equal(titles.length, names.length);
    now += RATING_CACHE_TTL + 1;
    await omdbRequest(names[0]);
    assert.equal(titles.length, names.length + 1);
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

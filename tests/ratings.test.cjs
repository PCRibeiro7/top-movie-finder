const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { setImmediate } = require('node:timers/promises');
const { gzipSync } = require('node:zlib');
const { test } = require('node:test');
const ts = require('typescript');

// Load the app's TypeScript with its existing compiler, without a test framework.
require.extensions['.ts'] = (module, filename) => {
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    module._compile(outputText, filename);
};

const { getMovieRating } = require('../src/features/ratings/client.ts');
const { default: omdbRequest } = require('../src/server/ratings/omdb.ts');
const { default: handler } = require('../pages/api/rating.ts');
const { imdbRating } = require('../src/server/ratings/imdb.ts');
const { findImdbTitleId } = require('../src/server/ratings/imdbTitles.ts');
const { findMovieImdbId } = require('../src/server/ratings/tmdb.ts');
const {
    IMDB_DATASET_CACHE_TTL,
    movieRatingKey,
    movieRatingLookup,
    RATING_BATCH_SIZE,
    RATING_CACHE_TTL,
    RATING_MISS_CACHE_TTL,
} = require('../src/shared/ratings.ts');

test('client batches unique titles serially and shares cached and in-flight ratings', async (t) => {
    const batches = [];
    let active = 0;
    let maxActive = 0;
    t.mock.method(global, 'fetch', async (url, options) => {
        assert.equal(url, '/api/rating');
        assert.equal(options.method, 'POST');
        const { movieNames, movies } = JSON.parse(options.body);
        const lookups = movies || movieNames;
        batches.push(lookups);
        maxActive = Math.max(maxActive, ++active);
        await setImmediate();
        active--;
        return Response.json({
            ratings: Object.fromEntries(lookups.map((movie) => [
                movies ? movieRatingKey(movie) : movie,
                { Response: 'True', imdbRating: '8.1', Title: movies ? movie.title : movie },
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

    const contexts = [
        { title: 'O Sentido da Vida', originalTitle: 'Soudain', releaseYear: 2026 },
        { title: 'O Sentido da Vida', originalTitle: 'Outro original', releaseYear: 2021 },
    ];
    const contextualRequests = contexts.map(getMovieRating);
    assert.equal(getMovieRating({ ...contexts[0], title: ' O SENTIDO DA VIDA ' }), contextualRequests[0]);
    await Promise.all(contextualRequests);
    assert.deepEqual(batches[3], contexts);
    await getMovieRating({ ...contexts[0], releaseYear: 2025 });
    assert.equal(batches.length, 5);
    await getMovieRating({ ...contexts[0], director: 'Another director', runtimeMinutes: 90 });
    assert.equal(batches.length, 6);
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
                        ? { error: 'Malformed provider result' }
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
        return Response.json({ Response: 'True', imdbRating: '8.0', Title: title, Year: title === 'Ran' ? '1985' : '2001' });
    });
    const names = [
        'A&B: Part-2',
        'Cars (20th Anniversary)',
        'The Fast and the Furious (25º Aniversário)',
        '  Sessão Debate: Fiz Um Foguete Imaginando Que Você Vinha',
        'Pré-Estreia Com Debate: Os Irmãos Segreto',
        ...Array.from({ length: 7 }, (_, index) => `Provider ${index}`),
        movieRatingLookup({ title: 'Ran (Relançamento)', originalTitle: 'Ran', premiereDate: { localDate: '2026-10-01' } }),
        movieRatingLookup({ title: 'Velozes & Furiosos (25º Aniversário)', originalTitle: 'The Fast and the Furious (25th Anniversary)', premiereDate: { localDate: '2026-11-12' } }),
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
    assert.deepEqual(titles.slice(-2), ['Ran', 'The Fast and the Furious']);
    assert.deepEqual(await omdbRequest(names[0]), ratings[0]);
    assert.equal(titles.length, names.length);
    now += RATING_CACHE_TTL + 1;
    await omdbRequest(names[0]);
    assert.equal(titles.length, names.length + 1);
});

test('IMDb shares daily gzip snapshots, isolates cancelled callers, and retries failed downloads', async (t) => {
    let now = Date.now() + IMDB_DATASET_CACHE_TTL * 2;
    t.mock.method(Date, 'now', () => now);
    let attempts = 0;
    let finish;
    const ready = new Promise((resolve) => { finish = resolve; });
    t.mock.method(global, 'fetch', async (url, options) => {
        assert.equal(url, 'https://datasets.imdbws.com/title.ratings.tsv.gz');
        assert.ok(options.signal);
        attempts++;
        if (attempts === 1) return new Response(new Uint8Array([1, 2, 3]));
        await ready;
        const score = attempts === 2 ? '7.6' : attempts === 4 ? '11.0' : '7.7';
        const gzip = gzipSync(`tconst\taverageRating\tnumVotes\ntt118262500\t9.9\t1\ntt11826250\t${score}\t410\n`);
        return new Response(new ReadableStream({
            start(controller) {
                controller.enqueue(gzip.subarray(0, 11));
                controller.enqueue(gzip.subarray(11));
                controller.close();
            },
        }));
    });

    await assert.rejects(imdbRating('tt11826250', new AbortController().signal));
    const cancelled = new AbortController();
    const first = imdbRating('tt11826250', cancelled.signal);
    const second = imdbRating('tt11826250', new AbortController().signal);
    const rejected = assert.rejects(first, { name: 'AbortError' });
    cancelled.abort();
    await rejected;
    finish();
    assert.equal(await second, '7.6');
    assert.equal(await imdbRating('tt1182625', new AbortController().signal), null);
    assert.equal(attempts, 2);
    now += IMDB_DATASET_CACHE_TTL + 1;
    assert.equal(await imdbRating('tt11826250', new AbortController().signal), '7.7');
    assert.equal(attempts, 3);
    now += IMDB_DATASET_CACHE_TTL + 1;
    await assert.rejects(imdbRating('tt11826250', new AbortController().signal), /IMDb ratings unavailable/);
    assert.equal(await imdbRating('tt11826250', new AbortController().signal), '7.7');
    assert.equal(attempts, 5);
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
                        { id: 2, title: 'Arroz amargo', original_title: 'Riso amaro', release_date: '1949-09-30' },
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
    assert.equal((await omdbRequest({ title: 'Arroz Amargo', releaseYear: 2026 })).imdbRating, '8.1');
    assert.equal(ids.length, 4);
});

test('provider fills IMDb scores, preserves matching metadata, and resolves localized titles with year context', async (t) => {
    const previousKey = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = 'test-tmdb-key';
    t.after(() => {
        if (previousKey === undefined) delete process.env.TMDB_API_KEY;
        else process.env.TMDB_API_KEY = previousKey;
    });
    const now = Date.now() + IMDB_DATASET_CACHE_TTL * 6;
    t.mock.method(Date, 'now', () => now);
    let downloads = 0;
    const searches = [];
    const lookups = [];
    t.mock.method(global, 'fetch', async (url) => {
        const { hostname, pathname, searchParams } = new URL(url);
        if (hostname === 'datasets.imdbws.com') {
            downloads++;
            return new Response(gzipSync('tconst\taverageRating\tnumVotes\ntt11826250\t7.6\t410\ntt15006536\t7.4\t198\ntt36834996\t6.8\t50\n'));
        }
        if (hostname === 'www.omdbapi.com') {
            const title = searchParams.get('t');
            lookups.push(title || searchParams.get('i'));
            if (title === 'Feito Pipa') {
                return Response.json({ Response: 'True', Title: title, Year: '2026', imdbID: 'tt11826250', imdbRating: 'N/A', Plot: 'Matching OMDb synopsis' });
            }
            if (title === '100 Dias') {
                return Response.json({ Response: 'False', Error: 'Request limit reached!' });
            }
            if (title === 'Soudain') {
                return Response.json({ Response: 'True', Title: title, Year: '2007', imdbID: 'tt3210562', imdbRating: '8.0', Plot: 'Wrong film' });
            }
            if (searchParams.get('i') === 'tt36834996') {
                return Response.json({ Response: 'True', Title: 'Suddenly', imdbID: 'tt36834996', imdbRating: 'N/A' });
            }
            if (searchParams.get('i') === 'tt10377864') {
                return Response.json({ Response: 'True', imdbID: 'tt10377864', imdbRating: '6.5' });
            }
            return Response.json({ Response: 'False', Error: 'Movie not found!' });
        }
        assert.equal(hostname, 'api.themoviedb.org');
        if (pathname === '/3/search/movie') {
            const title = searchParams.get('query');
            searches.push(title);
            return Response.json({ results:
                title === 'Feito Pipa'
                    ? [{ id: 1393615, title, original_title: title, release_date: '2026-06-05' }]
                    : title === '100 Dias'
                      ? [{ id: 2, title, release_date: '2026-10-29' }]
                      : title === 'O Sentido Da Vida'
                        ? [
                            { id: 3, title, original_title: 'Japanese original', release_date: '2026-06-19' },
                            { id: 4, title, release_date: '2021-09-23' },
                        ]
                        : title === 'Soudain'
                          ? [{ id: 5, title, release_date: '2007-01-01' }]
                          : [{ id: 6, title: 'Boiúna : Terror no Amazonas', original_title: 'Beware Boiúna', release_date: '2025-01-01' }],
            });
        }
        const ids = { 1393615: 'tt11826250', 2: 'tt15006536', 3: 'tt36834996', 6: 'tt10377864' };
        const id = ids[pathname.split('/')[3]];
        assert.ok(id);
        return Response.json({ imdb_id: id });
    });

    const ratings = await Promise.all([
        { title: 'Feito Pipa', releaseYear: 2026 },
        { title: '100 Dias', releaseYear: 2026 },
        { title: 'O Sentido Da Vida', originalTitle: 'Soudain', releaseYear: 2026 },
        { title: 'Boiúna – Terror No Amazonas', originalTitle: 'Boiúna: Legend Of The Amazon', releaseYear: 2026 },
    ].map(omdbRequest));
    assert.deepEqual(ratings.map((rating) => rating.imdbRating), ['7.6', '7.4', '6.8', '6.5']);
    assert.equal(ratings[0].Plot, 'Matching OMDb synopsis');
    assert.deepEqual(ratings[1], { Response: 'True', imdbID: 'tt15006536', imdbRating: '7.4' });
    assert.equal(ratings[2].imdbID, 'tt36834996');
    assert.equal(ratings[2].Plot, undefined);
    assert.ok(searches.includes('O Sentido Da Vida'));
    assert.ok(searches.includes('Soudain'));
    assert.ok(searches.includes('Boiúna – Terror No Amazonas'));
    assert.equal(downloads, 1);
    assert.deepEqual(await omdbRequest({ title: '100 Dias', releaseYear: 2026 }), ratings[1]);
    assert.equal(lookups.filter((title) => title === '100 Dias').length, 1);
    assert.equal(lookups.includes('tt15006536'), false);
});

test('provider distinguishes directors and runtimes and recovers missing IMDb links through exact canonical titles', async (t) => {
    const previousKey = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = 'test-tmdb-key';
    t.after(() => {
        if (previousKey === undefined) delete process.env.TMDB_API_KEY;
        else process.env.TMDB_API_KEY = previousKey;
    });
    const now = Date.now() + IMDB_DATASET_CACHE_TTL * 8;
    t.mock.method(Date, 'now', () => now);
    const candidates = [
        { id: 20, title: 'A Terra Do Meu Pai', original_title: 'Ojczyzna', release_date: '2026-06-19', runtime: 82, imdb_id: 'tt37304295', director: 'Paweł Pawlikowski' },
        { id: 21, title: 'Fatherland', original_title: 'Fatherland', release_date: '2026-08-03', runtime: 15, imdb_id: null, director: 'Someone Else' },
        { id: 22, title: 'Verity', original_title: 'Verity', release_date: '2026-09-30', runtime: 117, imdb_id: 'tt32261958', director: 'Michael Showalter' },
        { id: 23, title: 'Verity', original_title: 'Verity', release_date: '2026-10-31', runtime: 45, imdb_id: null, director: 'Parker Yeskey' },
        { id: 24, title: 'Uma Odisseia Criativa: Em Busca De Tolkien', original_title: 'Uma Odisseia Criativa: Em Busca De Tolkien', release_date: '2026-09-21', runtime: 123, imdb_id: null, director: 'Laís Almeida' },
        { id: 25, title: 'Live Viewing', original_title: 'Live Viewing', release_date: '2026-12-29', runtime: 195, imdb_id: 'tt50488328', director: 'Ha Jung-jae' },
        { id: 26, title: 'Os Irmãos Segreto', original_title: 'Os Irmãos Segreto', release_date: '2026-11-26', runtime: 0, imdb_id: null, director: 'Federico Ferrone, Michele Manzolini' },
        { id: 27, title: 'I Fratelli Segreto', original_title: 'I Fratelli Segreto', release_date: '2025-10-22', runtime: 90, imdb_id: null, director: 'Federico Ferrone, Michele Manzolini' },
        { id: 28, title: 'Swan Lake Filmed for IMAX', original_title: 'Le Lac des cygnes - Filmé pour IMAX', release_date: '2024-11-08', runtime: 139, imdb_id: 'tt32986839', director: 'Isabelle Julien' },
    ];
    const imdbQueries = [];
    const discoveries = [];
    let discoverySignal;
    t.mock.method(global, 'fetch', async (url, options) => {
        const { hostname, pathname, searchParams } = new URL(url);
        if (hostname === 'datasets.imdbws.com') {
            return new Response(gzipSync('tconst\taverageRating\tnumVotes\ntt32261958\t6.0\t37128\ntt45120828\t9.0\t10\ntt37899993\t6.7\t11\ntt32986839\t7.4\t58\n'));
        }
        if (hostname === 'v3.sg.media-imdb.com') {
            const query = decodeURIComponent(pathname.split('/').pop().slice(0, -5));
            imdbQueries.push(query);
            return Response.json({ d: query.includes('creative odyssey')
                ? [
                    { id: 'tt1111111', l: 'An unrelated popular film', qid: 'movie', y: 2026 },
                    { id: 'tt45120828', l: 'A Creative Odyssey: In Search of Tolkien', qid: 'movie', y: 2026 },
                ]
                : query.includes('irmaos segreto')
                  ? [{ id: 'tt37899993', l: 'I Fratelli Segreto', qid: 'movie', y: 2025 }]
                  : [
                    { id: 'tt2222222', l: 'Resolver ambiguous', qid: 'movie', y: 2026 },
                    { id: 'tt3333333', l: 'Resolver ambiguous', qid: 'movie', y: 2026 },
                ],
            });
        }
        if (hostname === 'www.omdbapi.com') {
            const title = searchParams.get('t');
            const id = searchParams.get('i');
            if (title === 'Paris Opera Ballet Swan Lake') {
                discoverySignal = options.signal;
                return Response.json({ Response: 'False', Error: 'Request limit reached!' }, { status: 401 });
            }
            if (title === 'Fatherland') return Response.json({ Response: 'True', Title: title, Year: '2026', Director: 'Christopher Menaul', Runtime: '106 min', imdbRating: '6.4', imdbID: 'tt0109779' });
            if (id === 'tt37304295') return Response.json({ Response: 'True', Title: 'Fatherland', Year: '2026', Director: 'Paweł Pawlikowski', Runtime: '82 min', imdbRating: '7.3', imdbID: id });
            if (id === 'tt32261958') return Response.json({ Response: 'True', Title: 'Verity', Year: '2026', imdbRating: 'N/A', imdbID: id });
            if (id === 'tt45120828') return Response.json({ Response: 'False', Error: 'Error getting data.' });
            if (id === 'tt50488328') return Response.json({ Response: 'False', Error: 'Incorrect IMDb ID.' });
            if (id === 'tt37899993') return Response.json({ Response: 'True', Title: 'I Fratelli Segreto', Year: '2025', imdbID: id, imdbRating: 'N/A' });
            return Response.json({ Response: 'False', Error: 'Movie not found!' });
        }
        assert.equal(hostname, 'api.themoviedb.org');
        if (pathname === '/3/search/person') {
            assert.equal(searchParams.get('query'), 'Isabelle Julien');
            assert.equal(options.signal, discoverySignal);
            return Response.json({ results: [
                { id: 100, name: 'Isabelle Julien' },
                { id: 101, name: 'Isabelle Julien' },
                { id: 102, name: 'Isabelle Julian' },
            ] });
        }
        if (pathname.includes('/movie_credits')) {
            discoveries.push(pathname);
            assert.equal(searchParams.get('language'), 'en-US');
            assert.equal(options.signal, discoverySignal);
            const id = Number(pathname.split('/')[3]);
            return Response.json({ id, crew: id === 100 ? [{ ...candidates[8], job: 'Director' }] : [] });
        }
        if (pathname === '/3/search/movie') {
            const title = searchParams.get('query');
            const results = title === 'A Terra Do Meu Pai' || title === 'Fatherland'
                ? candidates.slice(0, 2)
                : candidates.filter((candidate) => candidate.title === title);
            return Response.json({ results });
        }
        const candidate = candidates.find((movie) => movie.id === Number(pathname.split('/')[3]));
        assert.ok(candidate);
        if (candidate.id === 28) assert.equal(options.signal, discoverySignal);
        if (pathname.endsWith('/external_ids')) return Response.json({ imdb_id: candidate.imdb_id });
        assert.equal(searchParams.get('append_to_response'), 'credits');
        return Response.json({
            ...candidate,
            title: candidate.id === 24 ? 'A Creative Odyssey: In Search of Tolkien' : candidate.title,
            credits: { crew: [{ job: 'Director', name: candidate.director }] },
        });
    });

    const ratings = await Promise.all([
        { title: 'A Terra Do Meu Pai', originalTitle: 'Fatherland', releaseYear: 2026, director: 'Paweł Pawlikowski', runtimeMinutes: 82 },
        { title: 'Verity', releaseYear: 2026, director: 'Michael Showalter', runtimeMinutes: 118 },
        { title: 'Uma Odisseia Criativa: Em Busca De Tolkien', releaseYear: 2026, director: 'Laís Almeida', runtimeMinutes: 123 },
        { title: 'Live Viewing', releaseYear: 2026 },
        { title: 'Os Irmãos Segreto', releaseYear: 2026, director: 'Federico Ferrone, Michele Manzolini' },
        { title: 'Paris Opera Ballet Swan Lake', releaseYear: 2026, director: 'Isabelle Julien', runtimeMinutes: 140 },
    ].map(omdbRequest));
    assert.deepEqual(ratings.map((rating) => rating.imdbRating), ['7.3', '6.0', '9.0', 'N/A', '6.7', '7.4']);
    assert.deepEqual(ratings.map((rating) => rating.imdbID), ['tt37304295', 'tt32261958', 'tt45120828', 'tt50488328', 'tt37899993', 'tt32986839']);
    assert.deepEqual(imdbQueries.sort(), ['a creative odyssey in search of tolkien', 'os irmaos segreto']);
    assert.deepEqual(discoveries, ['/3/person/100/movie_credits', '/3/person/101/movie_credits']);
    assert.equal((await omdbRequest({ title: 'Os Irmãos Segreto', releaseYear: 2026, director: 'Different Director' })).Response, 'False');
    assert.equal(await findImdbTitleId(['Resolver ambiguous'], 2026, new AbortController().signal), null);
    assert.equal(await findImdbTitleId(['Resolver unrelated'], 2026, new AbortController().signal), null);
});

test('director discovery requires unique title and metadata evidence, respects limits, and uses the production year', async (t) => {
    const lookup = { title: 'Paris Opera Ballet Swan Lake', releaseYear: 2026, director: 'Isabelle Julien', runtimeMinutes: 140 };
    const movie = { id: 1319440, title: 'Swan Lake Filmed for IMAX', original_title: 'Le Lac des cygnes - Filmé pour IMAX', release_date: '2024-11-08', job: 'Director' };
    let people = [{ id: 1, name: 'Isabelle Julien' }];
    let credits = [movie];
    let director = 'Isabelle Julien';
    let runtime = 139;
    let id = 'tt32986839';
    let invalidPath;
    let timeout = false;
    let searches = 0;
    let filmographies = 0;
    let details = 0;
    const controller = new AbortController();
    const fetch = t.mock.method(global, 'fetch', async (url, options) => {
        const { hostname, pathname, searchParams } = new URL(url);
        assert.equal(options.signal, controller.signal);
        if (hostname === 'v3.sg.media-imdb.com') {
            return Response.json({ d: [
                { id: 'tt0002026', l: movie.title, qid: 'movie', y: 2026 },
                { id: 'tt32986839', l: movie.title, qid: 'movie', y: 2024 },
            ] });
        }
        assert.equal(hostname, 'api.themoviedb.org');
        if (pathname === invalidPath) return Response.json({ error: 'Invalid provider payload' });
        if (pathname === '/3/search/movie') return Response.json({ results: [] });
        if (pathname === '/3/search/person') {
            searches++;
            if (timeout) {
                controller.abort(new DOMException('Lookup deadline exceeded', 'TimeoutError'));
                options.signal.throwIfAborted();
            }
            return Response.json({ results: people });
        }
        if (pathname.endsWith('/movie_credits')) {
            filmographies++;
            assert.equal(searchParams.get('language'), 'en-US');
            return Response.json({ id: Number(pathname.split('/')[3]), crew: credits });
        }
        details++;
        assert.ok(credits.some((credit) => credit.id === Number(pathname.split('/')[3])));
        return Response.json({
            ...movie, id: Number(pathname.split('/')[3]), imdb_id: id, runtime,
            credits: { crew: director ? [{ job: 'Director', name: director }] : [] },
        });
    });

    for (const incomplete of [{ ...lookup, director: undefined }, { ...lookup, runtimeMinutes: undefined }]) {
        assert.equal(await findMovieImdbId(incomplete, controller.signal), null);
    }
    assert.equal(searches, 0);
    for (const metadata of [
        { director: 'Another director', runtime: 139 },
        { director: '', runtime: 139 },
        { director: 'Isabelle Julien', runtime: 134 },
        { director: 'Isabelle Julien', runtime: null },
    ]) {
        director = metadata.director;
        runtime = metadata.runtime;
        assert.equal(await findMovieImdbId(lookup, controller.signal), null);
    }
    director = 'Isabelle Julien';
    runtime = 139;
    for (const unrelated of [
        { ...movie, job: 'Editor' },
        { ...movie, title: 'Swan Song', original_title: 'Swan Song' },
    ]) {
        credits = [unrelated];
        assert.equal(await findMovieImdbId(lookup, controller.signal), null);
    }
    assert.equal(details, 4);
    credits = [movie, { ...movie, id: movie.id + 1 }];
    assert.equal(await findMovieImdbId(lookup, controller.signal), null);
    assert.equal(details, 6);

    const previousSearches = searches;
    assert.equal(await findMovieImdbId({ ...lookup, director: 'One, Two, Three, Four' }, controller.signal), null);
    assert.equal(searches, previousSearches);
    people = Array.from({ length: 4 }, (_, index) => ({ id: index + 1, name: 'Isabelle Julien' }));
    const previousFilmographies = filmographies;
    assert.equal(await findMovieImdbId(lookup, controller.signal), null);
    assert.equal(filmographies, previousFilmographies);
    people = [{ id: 1, name: 'Isabelle Julien' }];
    credits = Array.from({ length: 6 }, (_, index) => ({ ...movie, id: movie.id + index }));
    assert.equal(await findMovieImdbId(lookup, controller.signal), null);
    assert.equal(details, 6);

    credits = [movie, movie];
    id = null;
    assert.equal(await findMovieImdbId(lookup, controller.signal), 'tt32986839');
    assert.equal(details, 7);
    for (const path of ['/3/search/person', '/3/person/1/movie_credits', '/3/movie/1319440']) {
        invalidPath = path;
        await assert.rejects(findMovieImdbId(lookup, controller.signal), /Title resolver unavailable/);
    }
    invalidPath = undefined;
    timeout = true;
    const previousCalls = filmographies;
    await assert.rejects(findMovieImdbId(lookup, controller.signal), { name: 'TimeoutError' });
    assert.equal(filmographies, previousCalls);
    const previousFetches = fetch.mock.callCount();
    await assert.rejects(findMovieImdbId(lookup, controller.signal), { name: 'TimeoutError' });
    assert.equal(fetch.mock.callCount(), previousFetches);
});

test('provider retries resolver failures immediately and refreshes films without scores after the miss TTL', async (t) => {
    const previousKey = process.env.TMDB_API_KEY;
    process.env.TMDB_API_KEY = 'eyJtest-read-access-token';
    t.after(() => {
        if (previousKey === undefined) delete process.env.TMDB_API_KEY;
        else process.env.TMDB_API_KEY = previousKey;
    });
    let now = Date.now() + IMDB_DATASET_CACHE_TTL * 10;
    t.mock.method(Date, 'now', () => now);
    let attempts = 0;
    let quotaRecovered = false;
    t.mock.method(global, 'fetch', async (url, options) => {
        const { hostname, pathname, searchParams } = new URL(url);
        if (hostname === 'datasets.imdbws.com') {
            return new Response(gzipSync('tconst\taverageRating\tnumVotes\ntt0000001\t5.0\t10\n'));
        }
        if (hostname === 'www.omdbapi.com') {
            if (searchParams.get('t') === 'Deixe-me Viver') {
                return Response.json(quotaRecovered
                    ? { Response: 'True', Title: 'Deixe-me Viver', imdbID: 'tt40843049', imdbRating: '7.2', Director: 'Walther Neto', Runtime: '103 min' }
                    : { Response: 'False', Error: 'Request limit reached!' }, { status: quotaRecovered ? 200 : 401 });
            }
            return Response.json(searchParams.has('i')
                ? { Response: 'True', imdbRating: attempts === 2 ? 'N/A' : '7.4' }
                : { Response: 'False', Error: 'Movie not found!' });
        }
        assert.equal(searchParams.has('api_key'), false);
        assert.equal(options.headers.Authorization, 'Bearer eyJtest-read-access-token');
        if (pathname === '/3/search/movie') {
            attempts++;
            const title = searchParams.get('query');
            return attempts === 1
                ? Response.json({ status_message: 'Invalid API key' }, { status: 401 })
                : Response.json({ results: [{ id: title === 'Deixe-me Viver' ? 8 : 7, title, original_title: title }] });
        }
        return Response.json({ imdb_id: pathname.includes('/8/') ? 'tt40843049' : 'tt1234567' });
    });

    await assert.rejects(omdbRequest('Resolver retry'), /Title resolver unavailable/);
    assert.equal((await omdbRequest('Resolver retry')).imdbRating, 'N/A');
    await omdbRequest('Resolver retry');
    assert.equal(attempts, 2);
    now += RATING_MISS_CACHE_TTL + 1;
    assert.equal((await omdbRequest('Resolver retry')).imdbRating, '7.4');
    assert.equal(attempts, 3);
    const quotaMovie = { title: 'Deixe-me Viver', releaseYear: 2026, director: 'Walther Neto', runtimeMinutes: 103 };
    await assert.rejects(omdbRequest(quotaMovie), /Rating provider unavailable/);
    await assert.rejects(omdbRequest(quotaMovie), /Rating provider unavailable/);
    assert.equal(attempts, 5);
    quotaRecovered = true;
    assert.equal((await omdbRequest(quotaMovie)).imdbRating, '7.2');
    assert.equal(attempts, 5);
});

test('API isolates provider failures, caches missing movies, and reuses batch results for GET', async (t) => {
    let now = Date.now() + IMDB_DATASET_CACHE_TTL * 12;
    t.mock.method(Date, 'now', () => now);
    const titles = [];
    let downloads = 0;
    t.mock.method(global, 'fetch', async (url) => {
        const parsed = new URL(url);
        if (parsed.hostname === 'datasets.imdbws.com') {
            downloads++;
            return new Response(null, { status: 503 });
        }
        const title = parsed.searchParams.get('t');
        titles.push(title);
        return Response.json(
            title === 'API missing'
                ? { Response: 'False', Error: 'Movie not found!' }
                : title === 'API unavailable'
                  ? { Response: 'False', Error: 'Request limit reached!' }
                  : title === 'API dataset outage'
                    ? { Response: 'True', Title: title, Year: '2026', imdbID: 'tt9999999', imdbRating: 'N/A' }
                    : { Response: 'True', Title: title, Year: '2026', imdbRating: '9.0' },
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

    const movies = [
        { title: 'API context', originalTitle: 'API original', releaseYear: 2026 },
        { title: 'API context', originalTitle: 'API original', releaseYear: 2027 },
        { title: 'API dataset outage', releaseYear: 2026 },
    ];
    await handler({ method: 'POST', body: { movies: [...movies, movies[0]] } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.ratings[movieRatingKey(movies[0])].imdbRating, '9.0');
    assert.equal(res.body.ratings[movieRatingKey(movies[1])].imdbRating, '9.0');
    assert.equal(res.body.ratings[movieRatingKey(movies[2])], null);
    assert.equal(titles.length, 8);
    assert.equal(downloads, 1);
    await handler({ method: 'GET', query: { movieName: 'API dataset outage' } }, res);
    assert.equal(res.code, 502);
    assert.equal(downloads, 2);
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
        { method: 'POST', body: { movies: [] } },
        { method: 'POST', body: { movies: [{ title: ' ' }] } },
        { method: 'POST', body: { movies: [{ title: 'Movie', originalTitle: 1 }] } },
        { method: 'POST', body: { movies: [{ title: 'Movie', releaseYear: '2026' }] } },
        { method: 'POST', body: { movies: [{ title: 'Movie', releaseYear: 2026.5 }] } },
        { method: 'POST', body: { movies: [{ title: 'Movie', director: 1 }] } },
        { method: 'POST', body: { movies: [{ title: 'Movie', runtimeMinutes: 0 }] } },
        { method: 'POST', body: { movies: [{ title: 'Movie' }], movieNames: ['Movie'] } },
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

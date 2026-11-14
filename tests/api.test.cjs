const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    module._compile(outputText, filename);
};

const { default: movies } = require('../pages/api/movies.ts');
const { default: movie } = require('../pages/api/movie.ts');
const { default: sessions } = require('../pages/api/session.ts');
const { default: state } = require('../pages/api/state.ts');

test('Ingresso APIs reject invalid queries and methods before calling the provider', async (t) => {
    const fetch = t.mock.method(global, 'fetch', () => {
        throw new Error('Invalid requests must not reach the provider');
    });
    const cases = [
        [movies, { cityId: ' ' }], [movies, { cityId: ['1', '2'] }],
        [movie, {}], [movie, { movie: ['One', 'Two'] }],
        [sessions, {}], [sessions, { movieId: '1', cityId: '' }],
        [state, { state: 'SP' }], [state, { state: 'invalid', city: 'São Paulo' }],
    ];
    for (const [handler, query] of cases) {
        const res = {
            code: 0,
            status(code) { this.code = code; return this; },
            json() {},
        };
        await handler({ method: 'GET', query }, res);
        assert.equal(res.code, 400);
    }
    for (const handler of [movies, movie, sessions, state]) {
        const res = {
            code: 0,
            status(code) { this.code = code; return this; },
            json() {},
            setHeader(name, value) {
                assert.equal(name, 'Allow');
                assert.deepEqual(value, ['GET']);
            },
        };
        await handler({ method: 'POST', query: {} }, res);
        assert.equal(res.code, 405);
    }
    assert.equal(fetch.mock.callCount(), 0);
});

test('Ingresso APIs preserve successful payloads, default city, title matching, and city misses', async (t) => {
    const catalog = [{ id: '7', title: ' Filme ', providerField: true }];
    const paths = [];
    t.mock.method(global, 'fetch', async (url, options) => {
        const path = new URL(url).pathname;
        paths.push(path);
        assert.ok(options.signal instanceof AbortSignal);
        return Response.json(path.includes('/states/')
            ? { cities: [{ id: '1', name: 'São Paulo' }] }
            : path.includes('/sessions/') ? [] : catalog);
    });
    const res = {
        code: 0, body: null,
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; },
    };
    await movies({ method: 'GET', query: {} }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body, catalog);
    assert.equal(paths[0], '/v0/events/city/1');
    await movie({ method: 'GET', query: { movie: 'Filme' } }, res);
    assert.equal(res.body, '7');
    await movie({ method: 'GET', query: { movie: 'Outro' } }, res);
    assert.equal(res.body, null);
    await state({ method: 'GET', query: { state: ' sp ', city: 'sao paulo' } }, res);
    assert.equal(res.body, '1');
    await state({ method: 'GET', query: { state: 'SP', city: 'Outra cidade' } }, res);
    assert.equal(res.code, 404);
    await sessions({ method: 'GET', query: { movieId: 'a/b' } }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body, []);
    assert.equal(paths.at(-1), '/v0/sessions/city/1/event/a%2Fb/partnership/1');
});

test('Ingresso APIs return 502 for HTTP, JSON, and malformed provider failures', async (t) => {
    let response;
    t.mock.method(global, 'fetch', async () => response);
    const res = {
        code: 0, body: null,
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; },
    };
    for (const [handler, query, payload] of [
        [movies, {}, {}], [movies, {}, [{ id: '1', title: 'Filme', genres: {} }]],
        [state, { state: 'SP', city: 'São Paulo' }, { cities: {} }],
        [sessions, { movieId: '1' }, [{ theaters: [{ name: 'Cinema', rooms: {} }] }]],
    ]) {
        response = Response.json(payload);
        await handler({ method: 'GET', query }, res);
        assert.equal(res.code, 502);
        assert.equal(typeof res.body.error, 'string');
    }
    for (const failure of [new Response('', { status: 503 }), new Response('invalid json')]) {
        response = failure;
        await sessions({ method: 'GET', query: { movieId: '1' } }, res);
        assert.equal(res.code, 502);
    }
});

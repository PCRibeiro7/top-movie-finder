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

const { selectCatalogMovies } = require('../src/features/catalog/model.ts');
const { movieDetails, sessionPresentation, sortSessions } = require('../src/features/movie-details/model.ts');
const { parseSessionDays } = require('../src/shared/sessions.ts');

test('catalog filters accents and genres and sorts without changing provider order', () => {
    const movies = [
        { id: '1', title: 'Órbita', genres: ['Drama'], imdbRating: '8.5', premiereDate: { localDate: '2025-01-01' } },
        { id: '2', title: 'Ação', genres: ['Aventura'], imdbRating: '7.0', premiereDate: { localDate: '2026-01-01' } },
        { id: '3', title: 'Sem nota', genres: ['Drama'], premiereDate: { localDate: '2026-11-01' } },
    ];
    assert.deepEqual(selectCatalogMovies(movies, { title: ' ORBITA ', genre: 'Drama' }, 'rating').map((movie) => movie.id), ['1']);
    assert.deepEqual(selectCatalogMovies(movies, { title: 'orbita', genre: 'Aventura' }, 'rating'), []);
    for (const [sort, expected] of Object.entries({ rating: ['1', '2', '3'], title: ['2', '1', '3'], release: ['3', '2', '1'] })) {
        assert.deepEqual(selectCatalogMovies(movies, { title: '', genre: '' }, sort).map((movie) => movie.id), expected);
    }
    assert.deepEqual(movies.map((movie) => movie.id), ['1', '2', '3']);
});

test('sessions use the first day, deduplicate times, select positive prices, and handle coordinates', () => {
    const days = parseSessionDays([
        { isToday: true, dateFormatted: '14/11', theaters: [
            { name: 'Cinema', geolocation: { lat: '0', lng: '0' }, rooms: [
                { sessions: [{ date: { hour: '21:00' }, price: '30' }, { date: { hour: '18:00' }, price: 0 }] },
                { sessions: [{ date: { hour: '21:00' }, price: 20 }, { price: 'invalid' }, { price: -1 }] },
            ] },
            { name: 'Outro cinema', geolocation: { lat: '', lng: 'invalid' } },
        ] },
        { theaters: [{ name: 'Amanhã' }] },
    ]);
    const { date, rows } = sessionPresentation(days, { latitude: 0, longitude: 0 });
    assert.equal(date, 'Hoje, 14/11');
    assert.deepEqual(rows, [
        { name: 'Cinema', neighborhood: '', times: ['18:00', '21:00'], price: 20, distance: 0 },
        { name: 'Outro cinema', neighborhood: '', times: [], price: undefined, distance: undefined },
    ]);
    assert.equal(sessionPresentation(days, null).rows[0].distance, undefined);
    assert.deepEqual(sessionPresentation([], null), { date: '', rows: [] });
    assert.deepEqual(sortSessions(rows, { column: 'price', direction: 'desc' }), rows);
});

test('sessions reject malformed nested collections instead of leaving a dialog pending', () => {
    for (const value of [
        {}, [null], [{ theaters: {} }], [{ theaters: [{ name: 'Cinema', rooms: {} }] }],
        [{ theaters: [{ name: 'Cinema', rooms: [{ sessions: {} }] }] }],
    ]) {
        assert.throws(() => parseSessionDays(value));
    }
});

test('movie details preserve catalog metadata precedence and optional OMDb fallbacks', () => {
    const info = { Response: 'True', imdbRating: '8.1', Runtime: '120 min', Poster: 'https://example.com/poster', Plot: 'OMDb', Awards: 'N/A' };
    const movie = { id: '1', title: 'Filme', duration: '90', synopsis: 'Ingresso', images: [{ url: 'https://example.com/catalog' }], trailers: [{ url: 'www.example.com/trailer' }] };
    const details = movieDetails(movie, info);
    assert.equal(details.durationText, '90 min');
    assert.equal(details.poster, 'https://example.com/catalog');
    assert.equal(details.synopsis, 'Ingresso');
    assert.equal(details.trailer, 'https://www.example.com/trailer');
    assert.equal(details.awards, '');
    const fallback = movieDetails({ id: '2', title: 'Outro' }, info);
    assert.equal(fallback.durationText, '120 min');
    assert.equal(fallback.synopsis, 'OMDb');
    assert.equal(movieDetails({ id: '3', title: 'Sem dados' }).poster, '');
    assert.equal(Number.isNaN(movieDetails(movie, { ...info, imdbRating: '11' }).score), true);
});

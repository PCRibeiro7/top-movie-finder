import type { TmdbMovieRatingResponse } from './types';
import type { MovieRatingLookup } from '../../shared/ratingTypes';
import {
    cleanMovieTitle,
    movieTitleKey,
    normalizeRatingLookup,
    RATING_PROVIDER_TIMEOUT,
} from '../../shared/ratings';
import { isRecord } from '../../shared/validation';
import { matchingMovieMetadata } from './identity';
import { findImdbTitleId } from './imdbTitles';

const MAX_IDENTITY_CANDIDATES = 5;
const MAX_DIRECTORS = 3;
const MAX_DIRECTOR_PEOPLE = 3;

function isMovieCandidate(
    movie: unknown,
): movie is TmdbMovieRatingResponse['results'][number] {
    return (
        isRecord(movie) &&
        typeof movie.id === 'number' &&
        (movie.title == null || typeof movie.title === 'string') &&
        (movie.original_title == null ||
            typeof movie.original_title === 'string') &&
        (movie.release_date == null || typeof movie.release_date === 'string')
    );
}

async function tmdbJson(
    path: string,
    params: Record<string, string>,
    signal: AbortSignal,
): Promise<unknown> {
    signal.throwIfAborted();
    const credential = process.env.TMDB_API_KEY?.trim() || '';
    const bearer = credential.startsWith('eyJ');
    const query = new URLSearchParams(params);
    if (!bearer) query.set('api_key', credential);
    const response = await fetch(
        `https://api.themoviedb.org/3/${path}?${query}`,
        {
            signal,
            ...(bearer
                ? { headers: { Authorization: `Bearer ${credential}` } }
                : {}),
        },
    );
    if (!response.ok) throw new Error('Title resolver unavailable');
    return response.json();
}

export default async function tmdbRequest(
    movieTitle: string,
    signal = AbortSignal.timeout(RATING_PROVIDER_TIMEOUT),
): Promise<TmdbMovieRatingResponse> {
    const data = await tmdbJson(
        'search/movie',
        { query: cleanMovieTitle(movieTitle), language: 'pt-BR' },
        signal,
    );
    if (
        !isRecord(data) ||
        !Array.isArray(data.results) ||
        data.results.some((movie) => !isMovieCandidate(movie))
    ) {
        throw new Error('Title resolver unavailable');
    }
    return data as TmdbMovieRatingResponse;
}

function imdbId(value: unknown): string | null {
    if (value === null || value === '') return null;
    if (typeof value !== 'string' || !/^tt\d+$/.test(value)) {
        throw new Error('Title resolver unavailable');
    }
    return value;
}

async function movieMetadata(id: number, signal: AbortSignal) {
    const data = await tmdbJson(
        `movie/${id}`,
        { append_to_response: 'credits' },
        signal,
    );
    if (
        !isRecord(data) ||
        data.id !== id ||
        typeof data.title !== 'string' ||
        typeof data.original_title !== 'string' ||
        (data.runtime != null && typeof data.runtime !== 'number') ||
        !isRecord(data.credits) ||
        !Array.isArray(data.credits.crew)
    ) {
        throw new Error('Title resolver unavailable');
    }
    const directors: string[] = [];
    for (const person of data.credits.crew) {
        if (
            !isRecord(person) ||
            typeof person.job !== 'string' ||
            typeof person.name !== 'string'
        ) {
            throw new Error('Title resolver unavailable');
        }
        if (person.job === 'Director') directors.push(person.name);
    }
    return {
        title: data.title,
        originalTitle: data.original_title,
        runtimeMinutes: typeof data.runtime === 'number' ? data.runtime : null,
        director: directors.join(', '),
        imdbId: imdbId(data.imdb_id),
    };
}

async function findExactMovieImdbId(
    lookup: MovieRatingLookup,
    signal: AbortSignal,
): Promise<string | null> {
    const titles = [lookup.title, lookup.originalTitle].filter(
        (title): title is string => Boolean(title),
    );
    const keys = [...new Set(titles.map(movieTitleKey))];
    const candidates = new Map<
        number,
        TmdbMovieRatingResponse['results'][number]
    >();
    for (const title of titles) {
        const { results } = await tmdbRequest(title, signal);
        for (const result of results) candidates.set(result.id, result);
    }
    let matches = [...candidates.values()].filter((candidate) =>
        [candidate.title, candidate.original_title].some(
            (title) =>
                typeof title === 'string' && keys.includes(movieTitleKey(title)),
        ),
    );
    const bothTitles = matches.filter((candidate) =>
        keys.every((key) =>
            [candidate.title, candidate.original_title].some(
                (title) =>
                    typeof title === 'string' && movieTitleKey(title) === key,
            ),
        ),
    );
    if (bothTitles.length) matches = bothTitles;
    const releaseYear = lookup.releaseYear;
    if (matches.length > 1 && releaseYear !== undefined) {
        const recent = matches.filter((candidate) => {
            const year = Number(candidate.release_date?.match(/^(\d{4})-/)?.[1]);
            return year === releaseYear || year === releaseYear - 1;
        });
        if (recent.length || (!lookup.director && !lookup.runtimeMinutes)) {
            matches = recent;
        }
    }
    const metadata = new Map<number, Awaited<ReturnType<typeof movieMetadata>>>();
    if (
        matches.length > 1 &&
        matches.length <= MAX_IDENTITY_CANDIDATES &&
        (lookup.director || lookup.runtimeMinutes)
    ) {
        const verified = [];
        for (const candidate of matches) {
            const details = await movieMetadata(candidate.id, signal);
            metadata.set(candidate.id, details);
            if (matchingMovieMetadata(lookup, details) === true) {
                verified.push(candidate);
            }
        }
        matches = verified;
    }
    // A popular first result is not enough to identify a film safely.
    if (
        matches.length !== 1 ||
        !Number.isInteger(matches[0].id) ||
        matches[0].id <= 0
    ) {
        return null;
    }
    const candidate = matches[0];
    let details = metadata.get(candidate.id);
    if (details?.imdbId) return details.imdbId;
    if (!details) {
        const data = await tmdbJson(
            `movie/${candidate.id}/external_ids`,
            {},
            signal,
        );
        if (!isRecord(data)) throw new Error('Title resolver unavailable');
        const id = imdbId(data.imdb_id);
        if (id) return id;
        details = await movieMetadata(candidate.id, signal);
        if (details.imdbId) return details.imdbId;
    }
    if (matchingMovieMetadata(lookup, details) === false) return null;
    return findImdbTitleId(
        [details.title, details.originalTitle, ...titles],
        (releaseYear ??
            Number(candidate.release_date?.match(/^(\d{4})-/)?.[1])) || undefined,
        signal,
        lookup.director || lookup.runtimeMinutes
            ? async (alternative) => {
                const { results } = await tmdbRequest(alternative.title, signal);
                const exact = results.filter((result) => {
                    const year = Number(
                        result.release_date?.match(/^(\d{4})-/)?.[1],
                    );
                    return (
                        (releaseYear === undefined ||
                            year === releaseYear ||
                            year === releaseYear - 1) &&
                        [result.title, result.original_title].some((title) =>
                            typeof title === 'string' &&
                            movieTitleKey(title) === movieTitleKey(alternative.title),
                        )
                    );
                });
                if (exact.length > MAX_IDENTITY_CANDIDATES) return false;
                const verified = new Set<number>();
                for (const result of exact) {
                    const info = await movieMetadata(result.id, signal);
                    if (
                        (!info.imdbId || info.imdbId === alternative.id) &&
                        matchingMovieMetadata(lookup, info) === true
                    ) {
                        verified.add(result.id);
                    }
                }
                return verified.size === 1;
            }
            : undefined,
    );
}

function relatedMovieTitle(titles: string[], candidate: string) {
    const keys = titles.map(movieTitleKey);
    const key = movieTitleKey(candidate);
    if (keys.includes(key)) return true;
    const words = key.split(' ');
    return words.some(
        (word, index) =>
            word.length >= 4 &&
            words[index + 1]?.length >= 4 &&
            keys.some((title) =>
                ` ${title} `.includes(` ${word} ${words[index + 1]} `),
            ),
    );
}

async function findDirectorMovieImdbId(
    lookup: MovieRatingLookup,
    signal: AbortSignal,
): Promise<string | null> {
    if (!lookup.director || !lookup.runtimeMinutes) return null;
    const directors = new Map(
        lookup.director.split(',').map((name) => [movieTitleKey(name), name.trim()]),
    );
    directors.delete('');
    if (!directors.size || directors.size > MAX_DIRECTORS) return null;
    const people = new Set<number>();
    for (const [key, name] of directors) {
        const data = await tmdbJson(
            'search/person',
            { query: name, language: 'en-US' },
            signal,
        );
        if (!isRecord(data) || !Array.isArray(data.results)) {
            throw new Error('Title resolver unavailable');
        }
        for (const person of data.results) {
            if (
                !isRecord(person) ||
                typeof person.id !== 'number' ||
                !Number.isInteger(person.id) ||
                person.id <= 0 ||
                typeof person.name !== 'string'
            ) {
                throw new Error('Title resolver unavailable');
            }
            if (movieTitleKey(person.name) === key) {
                people.add(person.id);
            }
        }
        if (people.size > MAX_DIRECTOR_PEOPLE) return null;
    }
    const titles = [lookup.title, lookup.originalTitle || ''].filter(Boolean);
    const candidates = new Map<
        number,
        TmdbMovieRatingResponse['results'][number]
    >();
    for (const id of people) {
        const data = await tmdbJson(
            `person/${id}/movie_credits`,
            { language: 'en-US' },
            signal,
        );
        if (!isRecord(data) || data.id !== id || !Array.isArray(data.crew)) {
            throw new Error('Title resolver unavailable');
        }
        for (const movie of data.crew) {
            if (!isRecord(movie) || typeof movie.job !== 'string') {
                throw new Error('Title resolver unavailable');
            }
            if (movie.job !== 'Director') continue;
            if (
                !isMovieCandidate(movie) ||
                !Number.isInteger(movie.id) ||
                movie.id <= 0
            ) {
                throw new Error('Title resolver unavailable');
            }
            if (
                [movie.title, movie.original_title].some(
                    (title) =>
                        typeof title === 'string' &&
                        relatedMovieTitle(titles, title),
                )
            ) {
                candidates.set(movie.id, movie);
            }
        }
        if (candidates.size > MAX_IDENTITY_CANDIDATES) return null;
    }
    const matches = [];
    for (const candidate of candidates.values()) {
        const details = await movieMetadata(candidate.id, signal);
        if (
            details.director &&
            details.director !== 'N/A' &&
            details.runtimeMinutes &&
            Number.isInteger(details.runtimeMinutes) &&
            details.runtimeMinutes > 0 &&
            matchingMovieMetadata(lookup, details) === true &&
            [details.title, details.originalTitle].some((title) =>
                relatedMovieTitle(titles, title),
            )
        ) {
            matches.push({ candidate, details });
        }
    }
    if (matches.length !== 1) return null;
    const { candidate, details } = matches[0];
    if (details.imdbId) return details.imdbId;
    // This is the production year; the catalog year may be a later screening.
    const year = Number(candidate.release_date?.match(/^(\d{4})-/)?.[1]);
    if (!year) return null;
    return findImdbTitleId([details.title, details.originalTitle], year, signal);
}

export async function findMovieImdbId(
    movie: string | MovieRatingLookup,
    signal: AbortSignal,
): Promise<string | null> {
    const lookup = normalizeRatingLookup(movie);
    const exact = await findExactMovieImdbId(lookup, signal);
    return exact || findDirectorMovieImdbId(lookup, signal);
}

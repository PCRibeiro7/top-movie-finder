import type { TmdbMovieRatingResponse } from './types';
import { cleanMovieTitle, RATING_PROVIDER_TIMEOUT } from '../../shared/ratings';
import { isRecord } from '../../shared/validation';

async function tmdbJson(
    path: string,
    params: Record<string, string>,
    signal: AbortSignal,
): Promise<unknown> {
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
        data.results.some(
            (movie) =>
                !isRecord(movie) ||
                typeof movie.id !== 'number' ||
                (movie.title != null && typeof movie.title !== 'string') ||
                (movie.original_title != null &&
                    typeof movie.original_title !== 'string'),
        )
    ) {
        throw new Error('Title resolver unavailable');
    }
    return data as TmdbMovieRatingResponse;
}

function titleKey(title: string) {
    return cleanMovieTitle(title)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

export async function findMovieImdbId(
    movieTitle: string,
    signal: AbortSignal,
): Promise<string | null> {
    const { results } = await tmdbRequest(movieTitle, signal);
    const key = titleKey(movieTitle);
    const matches = results.filter(
        (movie) =>
            (typeof movie.title === 'string' &&
                titleKey(movie.title) === key) ||
            (typeof movie.original_title === 'string' &&
                titleKey(movie.original_title) === key),
    );
    // A popular first result is not enough to identify a film safely.
    if (matches.length !== 1 || !Number.isInteger(matches[0].id)) return null;
    const data = await tmdbJson(
        `movie/${matches[0].id}/external_ids`,
        {},
        signal,
    );
    if (!isRecord(data)) throw new Error('Title resolver unavailable');
    if (data.imdb_id === null) return null;
    if (typeof data.imdb_id !== 'string' || !/^tt\d+$/.test(data.imdb_id)) {
        throw new Error('Title resolver unavailable');
    }
    return data.imdb_id;
}

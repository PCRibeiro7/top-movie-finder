import type { MovieRatingResponse } from './ratingTypes';
import { isRecord } from './validation';

export const RATING_BATCH_SIZE = 10;
export const RATING_CACHE_TTL = 30 * 60 * 1000;
export const RATING_MISS_CACHE_TTL = 5 * 60 * 1000;
export const RATING_CACHE_LIMIT = 500;
export const RATING_MAX_CONCURRENT_REQUESTS = 4;
export const RATING_PROVIDER_TIMEOUT = 5000;
export const RATING_BATCH_TIMEOUT = 20000;

export type MovieRatingStatus =
    | 'rated'
    | 'unrated'
    | 'not-found'
    | 'unavailable';

export function isMovieRatingResponse(
    value: unknown,
): value is MovieRatingResponse {
    if (!isRecord(value)) return false;
    if (value.Response === 'False') return value.Error === 'Movie not found!';
    return (
        value.Response === 'True' &&
        typeof value.imdbRating === 'string' &&
        [
            'Title',
            'imdbID',
            'Runtime',
            'Poster',
            'Plot',
            'Metascore',
            'Awards',
        ].every((key) => value[key] == null || typeof value[key] === 'string')
    );
}

export function cleanMovieTitle(movieName: string) {
    return movieName
        .trim()
        .replace(
            /^(?:pr[ée][ -]estreia\s+com\s+debate|sess[ãa]o\s+(?:de\s+)?(?:debate|especial))\s*:\s*/i,
            '',
        )
        .replace(
            /\s*\(\s*(?:\d+\s*(?:[ºª°]|st|nd|rd|th)?\s*(?:anivers[áa]rio|anniversary)|relan[çc]amento|re-?release)\s*\)\s*$/i,
            '',
        )
        .trim()
        .replace(/\s+/g, ' ');
}

export function movieRatingKey(movieName: string) {
    return cleanMovieTitle(movieName).toLowerCase();
}

export function movieRatingResult(rating: MovieRatingResponse | null): {
    imdbRating: string;
    ratingStatus: MovieRatingStatus;
} {
    if (!rating) return { imdbRating: 'N/A', ratingStatus: 'unavailable' };
    if (rating.Response === 'False') {
        return { imdbRating: 'N/A', ratingStatus: 'not-found' };
    }
    const score = Number(rating.imdbRating);
    return Number.isFinite(score) && score > 0 && score <= 10
        ? { imdbRating: rating.imdbRating, ratingStatus: 'rated' }
        : { imdbRating: 'N/A', ratingStatus: 'unrated' };
}

export function movieRatingStatusText(status?: MovieRatingStatus) {
    switch (status) {
        case 'unrated':
            return 'Ainda sem avaliação';
        case 'not-found':
            return 'Nota não encontrada';
        case 'unavailable':
            return 'Nota indisponível';
        default:
            return 'Buscando nota...';
    }
}

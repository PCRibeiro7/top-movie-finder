import type { Movie, RatedMovie } from './movies';
import type { MovieRatingLookup, MovieRatingResponse } from './ratingTypes';
import { isRecord } from './validation';

export const RATING_BATCH_SIZE = 10;
export const RATING_CACHE_TTL = 30 * 60 * 1000;
export const RATING_MISS_CACHE_TTL = 5 * 60 * 1000;
export const RATING_CACHE_LIMIT = 500;
export const RATING_MAX_CONCURRENT_REQUESTS = 4;
export const RATING_PROVIDER_TIMEOUT = 5000;
export const RATING_BATCH_TIMEOUT = 20000;
export const IMDB_DATASET_CACHE_TTL = 24 * 60 * 60 * 1000;

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
            'Year',
            'Director',
            'imdbID',
            'Runtime',
            'Poster',
            'Plot',
            'Metascore',
            'Awards',
        ].every((key) => value[key] == null || typeof value[key] === 'string')
    );
}

const RERELEASE_SUFFIX =
    /\s*\(\s*(?:\d+\s*(?:[ºª°]|st|nd|rd|th)?\s*(?:anivers[áa]rio|anniversary)|relan[çc]amento|re-?release)\s*\)\s*$/i;

export function cleanMovieTitle(movieName: string) {
    return movieName
        .trim()
        .replace(
            /^(?:pr[ée][ -]estreia\s+com\s+debate|sess[ãa]o\s+(?:de\s+)?(?:debate|especial))\s*:\s*/i,
            '',
        )
        .replace(RERELEASE_SUFFIX, '')
        .trim()
        .replace(/\s+/g, ' ');
}

export function normalizeRatingLookup(
    movie: string | MovieRatingLookup,
): MovieRatingLookup {
    const lookup = typeof movie === 'string' ? { title: movie } : movie;
    const title = cleanMovieTitle(lookup.title);
    const originalTitle = cleanMovieTitle(lookup.originalTitle || '');
    const rerelease =
        RERELEASE_SUFFIX.test(lookup.title) ||
        RERELEASE_SUFFIX.test(lookup.originalTitle || '');
    const director = lookup.director?.trim().replace(/\s+/g, ' ');
    return {
        title,
        ...(originalTitle && originalTitle.toLowerCase() !== title.toLowerCase()
            ? { originalTitle }
            : {}),
        ...(lookup.releaseYear !== undefined && !rerelease
            ? { releaseYear: lookup.releaseYear }
            : {}),
        ...(director ? { director } : {}),
        ...(lookup.runtimeMinutes !== undefined
            ? { runtimeMinutes: lookup.runtimeMinutes }
            : {}),
    };
}

export function movieRatingLookup(
    movie: Pick<
        Movie,
        'title' | 'originalTitle' | 'premiereDate' | 'director' | 'duration'
    >,
): MovieRatingLookup {
    const year = movie.premiereDate?.localDate?.match(/^(\d{4})-/)?.[1];
    const runtime = Number(movie.duration);
    return normalizeRatingLookup({
        title: movie.title,
        originalTitle: movie.originalTitle || undefined,
        ...(year ? { releaseYear: Number(year) } : {}),
        director: movie.director || undefined,
        ...(Number.isInteger(runtime) && runtime > 0
            ? { runtimeMinutes: runtime }
            : {}),
    });
}

export function isMovieRatingLookup(value: unknown): value is MovieRatingLookup {
    return (
        isRecord(value) &&
        typeof value.title === 'string' &&
        Boolean(cleanMovieTitle(value.title)) &&
        (value.originalTitle === undefined ||
            typeof value.originalTitle === 'string') &&
        (value.director === undefined || typeof value.director === 'string') &&
        (value.runtimeMinutes === undefined ||
            (typeof value.runtimeMinutes === 'number' &&
                Number.isInteger(value.runtimeMinutes) &&
                value.runtimeMinutes > 0)) &&
        (value.releaseYear === undefined ||
            (typeof value.releaseYear === 'number' &&
                Number.isInteger(value.releaseYear) &&
                value.releaseYear >= 1000 &&
                value.releaseYear <= 9999))
    );
}

export function movieRatingKey(movie: string | MovieRatingLookup) {
    const { title, originalTitle, releaseYear, director, runtimeMinutes } =
        normalizeRatingLookup(movie);
    if (!title) return '';
    return originalTitle || releaseYear !== undefined || director || runtimeMinutes
        ? JSON.stringify([
              title.toLowerCase(),
              originalTitle?.toLowerCase() || '',
              releaseYear ?? null,
              ...(director || runtimeMinutes
                  ? [director?.toLowerCase() || '', runtimeMinutes ?? null]
                  : []),
          ])
        : title.toLowerCase();
}

export function movieTitleKey(title: string) {
    return cleanMovieTitle(title)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
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

export function isMovieRatingPending(
    movie: Pick<RatedMovie, 'imdbRating' | 'ratingStatus'>,
) {
    const score = Number(movie.imdbRating);
    return (
        movie.ratingStatus === undefined &&
        !(Number.isFinite(score) && score > 0 && score <= 10)
    );
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

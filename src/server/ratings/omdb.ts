import type {
    MovieRatingLookup,
    MovieRatingResponse,
} from '../../shared/ratingTypes';
import { imdbRating } from './imdb';
import { matchingMovieMetadata } from './identity';
import { findMovieImdbId } from './tmdb';
import { isRecord } from '../../shared/validation';
import {
    normalizeRatingLookup,
    movieTitleKey,
    movieRatingKey,
    movieRatingResult,
    RATING_CACHE_LIMIT,
    RATING_CACHE_TTL,
    RATING_MISS_CACHE_TTL,
    RATING_MAX_CONCURRENT_REQUESTS,
    RATING_PROVIDER_TIMEOUT,
    isMovieRatingResponse,
} from '../../shared/ratings';

const cache = new Map<
    string,
    { rating: MovieRatingResponse; expiresAt: number }
>();
const inFlight = new Map<string, Promise<MovieRatingResponse>>();
const waiting: (() => void)[] = [];
let activeRequests = 0;

async function omdbJson(
    lookup: { t: string } | { i: string },
    signal: AbortSignal,
): Promise<MovieRatingResponse> {
    const params = new URLSearchParams({
        ...lookup,
        apikey: process.env.OMDB_API_KEY || '',
    });
    const response = await fetch(`https://www.omdbapi.com/?${params}`, {
        signal,
    });
    if (!response.ok) throw new Error('Rating provider unavailable');
    const rating: unknown = await response.json();
    // OMDb also uses this response for valid IDs it has not indexed yet.
    if (
        'i' in lookup &&
        isRecord(rating) &&
        rating.Response === 'False' &&
        rating.Error === 'Incorrect IMDb ID.'
    ) {
        return { Response: 'False', Error: 'Movie not found!' };
    }
    if (!isMovieRatingResponse(rating)) {
        throw new Error('Rating provider unavailable');
    }
    return rating;
}

function matchingRating(
    rating: MovieRatingResponse,
    lookup: MovieRatingLookup,
    resolved = false,
) {
    if (rating.Response !== 'True') return false;
    const metadata = matchingMovieMetadata(lookup, {
        director: rating.Director,
        runtimeMinutes: Number(rating.Runtime?.match(/^(\d+)\s*min$/)?.[1]),
    });
    if (metadata === false) return false;
    const title = rating.Title;
    if (
        !resolved &&
        title &&
        ![lookup.title, lookup.originalTitle].some(
            (candidate) => candidate && movieTitleKey(candidate) === movieTitleKey(title),
        )
    ) {
        return false;
    }
    if (!resolved && lookup.releaseYear !== undefined && metadata !== true) {
        const year = Number(rating.Year?.match(/^(\d{4})/)?.[1]);
        if (year !== lookup.releaseYear && year !== lookup.releaseYear - 1) {
            return false;
        }
    }
    return true;
}

async function fetchRating(
    movie: string | MovieRatingLookup,
): Promise<MovieRatingResponse> {
    if (activeRequests >= RATING_MAX_CONCURRENT_REQUESTS) {
        await new Promise<void>((resolve) => waiting.push(resolve));
    } else {
        activeRequests++;
    }
    try {
        // All fallback steps share a deadline instead of extending each lookup.
        const signal = AbortSignal.timeout(RATING_PROVIDER_TIMEOUT);
        const lookup = normalizeRatingLookup(movie);
        const title = lookup.originalTitle || lookup.title;
        if (!title) return { Response: 'False', Error: 'Movie not found!' };
        let rating = await omdbJson({ t: title }, signal);
        const matching = matchingRating(rating, lookup);
        if (matching && movieRatingResult(rating).ratingStatus === 'rated') {
            return rating;
        }
        const resolvedId = process.env.TMDB_API_KEY?.trim()
            ? await findMovieImdbId(lookup, signal)
            : null;
        const directId =
            matching &&
            rating.Response === 'True' &&
            rating.Title &&
            typeof rating.imdbID === 'string' &&
            /^tt\d+$/.test(rating.imdbID)
                ? rating.imdbID
                : null;
        const imdbId = resolvedId || directId;
        if (!imdbId) {
            return matching
                ? rating
                : { Response: 'False', Error: 'Movie not found!' };
        }
        if (
            resolvedId &&
            (rating.Response !== 'True' || rating.imdbID !== imdbId)
        ) {
            try {
                rating = await omdbJson({ i: imdbId }, signal);
            } catch (error) {
                // A verified identity can still have a score in the daily data.
                const score = await imdbRating(imdbId, signal);
                if (score) {
                    return { Response: 'True', imdbID: imdbId, imdbRating: score };
                }
                throw error;
            }
            if (
                rating.Response === 'True' &&
                rating.imdbID &&
                rating.imdbID !== imdbId
            ) {
                throw new Error('Rating provider unavailable');
            }
        }
        const metadata =
            rating.Response === 'True' && matchingRating(rating, lookup, true)
                ? rating
                : undefined;
        if (metadata && movieRatingResult(metadata).ratingStatus === 'rated') {
            return { ...metadata, imdbID: imdbId };
        }
        const score = await imdbRating(imdbId, signal);
        return {
            ...metadata,
            Response: 'True',
            imdbID: imdbId,
            imdbRating: score || 'N/A',
        };
    } finally {
        // Transfer the slot to a waiter before admitting another request.
        const next = waiting.shift();
        if (next) next();
        else activeRequests--;
    }
}

export default function omdbRequest(
    movieTitle: string | MovieRatingLookup,
): Promise<MovieRatingResponse> {
    const key = movieRatingKey(movieTitle);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return Promise.resolve(cached.rating);
    }
    cache.delete(key);
    const existing = inFlight.get(key);
    if (existing) return existing;

    const request = fetchRating(movieTitle)
        .then((rating) => {
            cache.set(key, {
                rating,
                expiresAt:
                    Date.now() +
                    (movieRatingResult(rating).ratingStatus === 'rated'
                        ? RATING_CACHE_TTL
                        : RATING_MISS_CACHE_TTL),
            });
            if (cache.size > RATING_CACHE_LIMIT) {
                cache.delete(cache.keys().next().value!);
            }
            return rating;
        })
        .finally(() => inFlight.delete(key));
    inFlight.set(key, request);
    return request;
}

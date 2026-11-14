import type { MovieRatingResponse } from '../../shared/ratingTypes';
import { findMovieImdbId } from './tmdb';
import {
    cleanMovieTitle,
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
    if (!isMovieRatingResponse(rating)) {
        throw new Error('Rating provider unavailable');
    }
    return rating;
}

async function fetchRating(movieTitle: string): Promise<MovieRatingResponse> {
    if (activeRequests >= RATING_MAX_CONCURRENT_REQUESTS) {
        await new Promise<void>((resolve) => waiting.push(resolve));
    } else {
        activeRequests++;
    }
    try {
        // All fallback steps share a deadline instead of extending each lookup.
        const signal = AbortSignal.timeout(RATING_PROVIDER_TIMEOUT);
        const title = cleanMovieTitle(movieTitle);
        if (!title) return { Response: 'False', Error: 'Movie not found!' };
        const rating = await omdbJson({ t: title }, signal);
        if (
            movieRatingResult(rating).ratingStatus !== 'rated' &&
            process.env.TMDB_API_KEY
        ) {
            const imdbId = await findMovieImdbId(title, signal);
            if (imdbId) return await omdbJson({ i: imdbId }, signal);
        }
        return rating;
    } finally {
        // Transfer the slot to a waiter before admitting another request.
        const next = waiting.shift();
        if (next) next();
        else activeRequests--;
    }
}

export default function omdbRequest(
    movieTitle: string,
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

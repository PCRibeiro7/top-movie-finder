import type { MovieRatingResponse } from '../types/OmdbMovieRating';
import {
    movieRatingKey,
    RATING_CACHE_LIMIT,
    RATING_CACHE_TTL,
    RATING_MISS_CACHE_TTL,
} from '../utils/movieRatings';

const cache = new Map<
    string,
    { rating: MovieRatingResponse; expiresAt: number }
>();
const inFlight = new Map<string, Promise<MovieRatingResponse>>();
const waiting: (() => void)[] = [];
const MAX_CONCURRENT_REQUESTS = 4;
let activeRequests = 0;

async function fetchRating(movieTitle: string): Promise<MovieRatingResponse> {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
        await new Promise<void>((resolve) => waiting.push(resolve));
    } else {
        activeRequests++;
    }
    try {
        const params = new URLSearchParams({
            t: movieTitle.trim(),
            apikey: process.env.OMDB_API_KEY || '',
        });
        const response = await fetch(`https://www.omdbapi.com/?${params}`, {
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error('Rating provider unavailable');
        const rating: MovieRatingResponse = await response.json();
        if (
            (rating.Response !== 'True' && rating.Response !== 'False') ||
            (rating.Response === 'True' &&
                typeof rating.imdbRating !== 'string') ||
            (rating.Response === 'False' && rating.Error !== 'Movie not found!')
        ) {
            throw new Error('Rating provider unavailable');
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
                    (rating.Response === 'False'
                        ? RATING_MISS_CACHE_TTL
                        : RATING_CACHE_TTL),
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

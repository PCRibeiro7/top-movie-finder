import type {
    MovieRatingLookup,
    MovieRatingResponse,
} from '../../shared/ratingTypes';
import { isRecord } from '../../shared/validation';
import {
    movieRatingKey,
    normalizeRatingLookup,
    movieRatingResult,
    RATING_BATCH_SIZE,
    RATING_CACHE_LIMIT,
    RATING_CACHE_TTL,
    RATING_MISS_CACHE_TTL,
    RATING_BATCH_TIMEOUT,
    isMovieRatingResponse,
} from '../../shared/ratings';

const cache = new Map<
    string,
    { rating: MovieRatingResponse; expiresAt: number }
>();
const inFlight = new Map<string, Promise<MovieRatingResponse>>();
const pending: {
    movieName?: string;
    movie: MovieRatingLookup;
    key: string;
    resolve: (rating: MovieRatingResponse) => void;
    reject: (error: Error) => void;
}[] = [];
let flushing = false;

async function flushRatings() {
    while (pending.length) {
        const batch = pending.splice(0, RATING_BATCH_SIZE);
        const legacy = batch.every((entry) => entry.movieName !== undefined);
        try {
            const response = await fetch('/api/rating', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    legacy
                        ? { movieNames: batch.map(({ movieName }) => movieName) }
                        : { movies: batch.map(({ movie }) => movie) },
                ),
                signal: AbortSignal.timeout(RATING_BATCH_TIMEOUT),
            });
            if (!response.ok) throw new Error('Ratings unavailable');
            const data: unknown = await response.json();
            const ratings =
                isRecord(data) && isRecord(data.ratings) ? data.ratings : {};
            for (const entry of batch) {
                const rating = ratings[legacy ? entry.movieName! : entry.key];
                inFlight.delete(entry.key);
                if (!isMovieRatingResponse(rating)) {
                    entry.reject(new Error('Rating unavailable'));
                    continue;
                }
                cache.delete(entry.key);
                cache.set(entry.key, {
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
                entry.resolve(rating);
            }
        } catch {
            for (const entry of batch) {
                inFlight.delete(entry.key);
                entry.reject(new Error('Ratings unavailable'));
            }
        }
    }
    flushing = false;
}

export function getMovieRating(
    movieName: string | MovieRatingLookup,
): Promise<MovieRatingResponse> {
    const key = movieRatingKey(movieName);
    if (!key) {
        return Promise.resolve({
            Response: 'False',
            Error: 'Movie not found!',
        });
    }
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return Promise.resolve(cached.rating);
    }
    cache.delete(key);
    const existing = inFlight.get(key);
    if (existing) return existing;

    const promise = new Promise<MovieRatingResponse>((resolve, reject) => {
        pending.push({
            ...(typeof movieName === 'string'
                ? { movieName: movieName.trim() }
                : {}),
            movie: normalizeRatingLookup(movieName),
            key,
            resolve,
            reject,
        });
    });
    inFlight.set(key, promise);
    if (!flushing) {
        flushing = true;
        queueMicrotask(() => void flushRatings());
    }
    // Shared requests finish and populate the cache even if a consumer closes.
    return promise;
}

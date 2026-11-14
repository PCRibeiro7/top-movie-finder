import type { MovieRatingResponse } from '../../shared/ratingTypes';
import { isRecord } from '../../shared/validation';
import {
    movieRatingKey,
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
    movieName: string;
    key: string;
    resolve: (rating: MovieRatingResponse) => void;
    reject: (error: Error) => void;
}[] = [];
let flushing = false;

async function flushRatings() {
    while (pending.length) {
        const batch = pending.splice(0, RATING_BATCH_SIZE);
        try {
            const response = await fetch('/api/rating', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    movieNames: batch.map(({ movieName }) => movieName),
                }),
                signal: AbortSignal.timeout(RATING_BATCH_TIMEOUT),
            });
            if (!response.ok) throw new Error('Ratings unavailable');
            const data: unknown = await response.json();
            const ratings =
                isRecord(data) && isRecord(data.ratings) ? data.ratings : {};
            for (const entry of batch) {
                const rating = ratings?.[entry.movieName];
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
    movieName: string,
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
        pending.push({ movieName: movieName.trim(), key, resolve, reject });
    });
    inFlight.set(key, promise);
    if (!flushing) {
        flushing = true;
        queueMicrotask(() => void flushRatings());
    }
    // Shared requests finish and populate the cache even if a consumer closes.
    return promise;
}

export const RATING_BATCH_SIZE = 10;
export const RATING_CACHE_TTL = 30 * 60 * 1000;
export const RATING_MISS_CACHE_TTL = 5 * 60 * 1000;
export const RATING_CACHE_LIMIT = 500;

export function movieRatingKey(movieName: string) {
    return movieName.trim().replace(/\s+/g, ' ').toLowerCase();
}

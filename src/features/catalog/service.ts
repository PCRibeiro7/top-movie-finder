import { fetchJson } from '../../shared/http';
import { parseMovies, type RatedMovie } from '../../shared/movies';
import {
    movieRatingKey,
    movieRatingLookup,
    movieRatingResult,
    RATING_BATCH_SIZE,
} from '../../shared/ratings';
import { getMovieRating } from '../ratings/client';

export async function loadCatalog(cityId: string, signal: AbortSignal) {
    return parseMovies(
        await fetchJson(
            `/api/movies?${new URLSearchParams({ cityId })}`,
            signal,
        ),
    );
}

export type RatingResult = ReturnType<typeof movieRatingResult>;

export async function enrichCatalog(
    movies: RatedMovie[],
    signal: AbortSignal,
    onBatch: (ratings: Map<string, RatingResult>) => void,
) {
    const lookups = [
        ...new Map(
            movies.map((movie) => {
                const lookup = movieRatingLookup(movie);
                return [movieRatingKey(lookup), lookup] as const;
            }),
        ).values(),
    ];
    for (let index = 0; index < lookups.length; index += RATING_BATCH_SIZE) {
        if (signal.aborted) return;
        const ratings = await Promise.all(
            lookups.slice(index, index + RATING_BATCH_SIZE).map(async (lookup) => {
                const key = movieRatingKey(lookup);
                try {
                    return [
                        key,
                        movieRatingResult(await getMovieRating(lookup)),
                    ] as const;
                } catch {
                    return [key, movieRatingResult(null)] as const;
                }
            }),
        );
        if (signal.aborted) return;
        onBatch(new Map(ratings));
    }
}
